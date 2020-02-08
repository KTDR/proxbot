import Util = require('./MyDiscordUtils') ; //importing frequently used functions into global namespace for now
import EventEmitter from "events";  //Events make working with this class easier.
import Discord = require('discord.js'); //TODO: Make this an optional import, this class doesn't rely on discord, or move DiscordFunction somewhere else

//TODO: array of these timestamp objects within a single heartbeat object?
//TODO: In function binding account for and remove intervals with an empty function list
//TODO: Eventually make this class generic, only relying on specified type to implement a certain interface. Apparantly interfaces aren't usable for this purpose in TS/JS?

/**
 * Creates an object that, once started, runs in the background to keep track of time for certain modules within the bot. 
 * Ideally this will synchronize with a global heartbeat to make sure all timestamp objects increment at the same time.
 */
class MyTimestamper extends EventEmitter {

    private timestamp: number; //intended to keep track of how many seconds since this timestamper was started
    private interval: NodeJS.Timeout;   // to be pointed to the setInterval() function used to increment the timestamp and allows control of it
    private active: boolean;    //flag to keep track of when the setInterval() is active
    private bindedFunctions: Map<number, Map<string, BindedFunction>>; //I couldn't figure out how to stop a function after it was binded as a node.js event listener, so i'm just making my own implementation here, for time-based events
    private highestBindedInterval: number;
    private aliveTime: number;  //Tracks how long since the object was started, useful when tracking binded functions
    
    /**
     * Creates a new timestamp object, but does not start it. Call the start() method to start counting when ready.
     * @param startValue Inital timestamp for this object, defaulting to zero.
     */
    constructor(startValue: number = 0) {
        super();    //initialize the EventEmitter base object
        this.timestamp = startValue;
        this.interval = null;   //Establish a pointer to the setInterval() function so it can be manipulated
        this.active = false;    //A timestamper will only update on heartbeat if it's active
        this.bindedFunctions = new Map();   //holds references to functions attached to this timestamp object
        this.highestBindedInterval = 0;
        console.log("Timestamp is " + this.timestamp);
    }

    /**
     * Starts the setInterval() for this timestamper object.
     */
    start(): MyTimestamper {
        if (!this.active) {
            //adds one to the alive time every second. Not the safest way to call the function, ideally should be private but setInterval() then apparantly cannot see it.
            this.interval = setInterval( () => { this.addSeconds() }, 1000);  
            this.active = true;
        }
        return this;
    }

    /**
     * Stops the setInterval() function, does not reset the timestamp.
     * TODO: Modify this to return the object
     */
    stop(): void {
        clearTimeout(this.interval);
        this.interval = null;
        this.active = false;
        Util.myLogger("Stopped a timestamper object");
    }

    /**
     * Changes the timestamp of this object without stopping any existing intervals.
     * TODO: Make this only accept integers
     * @param newTimestamp The new timestamp for this object to hold
     * @returns The current timestamper object
     */
    changeTimestamp(newTimestamp: number): MyTimestamper {
        this.timestamp = newTimestamp;
        //console.log("new timestamp: " + this.timestamp);
        return this;
    }

    /**
     * Bind a function to this timestamper that runs every x seconds, specified by interval parameter. Function must return a boolean value, and 
     * will be unbinded when it evaluates to false.
     * @param interval in seconds, how often it should be run
     * @param func The boolean function to be binded.
     */
    public bindFunction(interval: number, func: (() => boolean) ) {
        let newFunction = new BindedFunction(func, this.timestamp, this.timestamp.toString());
        let newFuncMap: Map<string, BindedFunction>;

        if (this.bindedFunctions.has(interval)) {   //if a function map on that interval already exists
            if (this.bindedFunctions.get(interval).has(newFunction.ID())) { //If a function with a matching ID already exists on the map of this interval
                console.log("Matching function found, not adding");
            }
            else {
                this.bindedFunctions.get(interval).set(newFunction.ID(), newFunction);
                if (interval > this.highestBindedInterval) {
                    this.highestBindedInterval = interval;
                    Util.myLogger("function binded, added");
                }
            }
        }
        else {  //if a new map of binded functions must be created on this interval
            newFuncMap = new Map(); //create a new map of bindable functions
            newFuncMap.set(newFunction.ID(), newFunction);
            this.bindedFunctions.set(interval, newFuncMap);
            if (interval > this.highestBindedInterval) {
                this.highestBindedInterval = interval;
            }
        }
    }
    
    private evaluateBindedFunctions() { 
        let result: boolean;
        let functionName: string;
        let index: number;
        let functionsOnInterval: Map<string, BindedFunction> = null;

        Util.myLogger("in evaluation function");

        for (const [key, funcs] of this.bindedFunctions.entries()) { //iterate through every interval/functionList pair in the object
            Util.myLogger("Evaluating functions on key" + key + " at timestamp" + this.timestamp);
            if (this.timestamp%key === 0) { //process functions on this interval
                functionsOnInterval = funcs;
                for (const [funcID, func] of functionsOnInterval.entries()) {
                    //Util.myLogger("Evaluating function " + funcID);
                    result = func.run();
                    if (result === false) {
                        functionsOnInterval.delete(funcID);
                        //TODO: need to account for possible new highest binded interval
                    }
                }
            }
        }
    }

    /**
     * Added an emitter so other functions can subscribe to new timestamps and time themselves accordingly.
     */
    private addSeconds(): void {   
        this.timestamp++;
        //this.aliveTime++;
        this.emit('stamp', this.timestamp);
        this.evaluateBindedFunctions();
        //console.log(this.timestamp);
    }

    /**
     * Returns a number representing the timestamp of this object at the moment of call
     */
    public getTimestamp(): number {
        return this.timestamp;
    }

    /**
     * Incomplete implementation do not use!
     * @param timestamp 
     */
    calcFutureTimestamp(timestamp: number): number {
        return this.timestamp + timestamp;
    }

}


class BindedFunction implements IdentifiableFunction {
    private containedFunction: () => boolean;    //a function that is called on run(), and must return a boolean, false when no longer needs to be called.
    bindedTimestamp: number;  //Ideally should be in milliseconds, for now in seconds. Tracks when the function was first binded.
    functionName: string;
    uniqueElement: string;
    basicID: string;   

    constructor(func: (() => boolean), bindedTimestamp: number, uniqueElement: string) {
        this.containedFunction = func;
        this.functionName = func.name;
        this.uniqueElement = uniqueElement;
        this.bindedTimestamp = bindedTimestamp;
        this.basicID = this.ID();
    }
    
    public ID(): string {
        if (!this.basicID) {
            this.basicID = this.functionName + this.bindedTimestamp.toString() + this.uniqueElement.toString(); 
        }
        return this.basicID;
    }

    public run(): boolean {
        return this.containedFunction();
    }
}

interface IdentifiableFunction {
    functionName: string;
    uniqueElement: string;

    ID(): string;   //Should return a unique ID for this object
    run(): boolean; //runs the function once when called, and returns a boolean value, false if function is finished.
}

class DiscordFunction extends BindedFunction {
    serverID: Discord.Snowflake;    //ID of server that had this function binded
    //serverAuthorization: number;    //Authorization level of calling server

    constructor(func: (() => boolean), bindedTimestamp: number, serverID: Discord.Snowflake) {
        super(func, bindedTimestamp, serverID);
        this.serverID = serverID;
        //this.serverAuthorization = serverAuthorization;
        this.basicID = null;    //reset the basic id as the superclass doesn't do it the way I want it here, ideally define getters/setters instead
    }

    public ID(): string {
        if (!this.basicID) {
            this.basicID = this.serverID.toString() + this.functionName;    //I want a function object to be considered unique per server and per function, so a server can only have one of each function running
        }
        return this.basicID;
    }
}
export = MyTimestamper;