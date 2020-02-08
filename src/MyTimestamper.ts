import Util = require('./MyDiscordUtils') ; //importing frequently used functions into global namespace for now
import EventEmitter from "events";

//TODO: array of these timestamp objects within a single heartbeat object?
//TODO: In function binding account for and remove intervals with an empty function list


/**
 * Creates an object that, once started, Runs in the background to keep track of time for certain modules within the bot. 
 * Ideally this will synchronize with a global heartbeat to make sure all timestamp objects increment at the same time.
 */
class MyTimestamper extends EventEmitter {

    private timestamp: number; //intended to keep track of how many seconds since this timestamper was started
    private interval: NodeJS.Timeout;   // to be pointed to the setInterval() function used to increment the timestamp and allows control of it
    private active: boolean;    //flag to keep track of when the setInterval is active
    private bindedFunctions: Map<number, Function[]>; //Couldn't figure out how to stop a function after it was binded as a node.js event listener so i'm just making my own implementation here, for time-based events
    private highestBindedInterval: number;
    //private aliveTime: number;  //Tracks how long since the object was started
    
    /**
     * Creates a new timestamp object, but does not start it. Call the start() method to start counting when ready.
     * @param startValue Inital timestamp for this object, defaulting to zero.
     */
    constructor(startValue: number = 0) {
        super();
        this.timestamp = startValue;
        this.interval = null;
        this.active = false;
        this.bindedFunctions = new Map();
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
     */
    stop(): void {
        clearTimeout(this.interval);
        this.interval = null;
        this.active = false;
        console.log("Stopped a timestamper object");
    }

    /**
     * Changes the timestamp of this object without stopping any existing intervals.
     * @param newTimestamp The new timestamp for this object to hold
     * @returns The current timestamper object
     */
    changeTimestamp(newTimestamp: number): MyTimestamper {
        this.timestamp = newTimestamp;
        //console.log("new timestamp: " + this.timestamp);
        return this;
    }

    /**
     * Bind a function to this timestamper that runs every x seconds, specified by interval. Function must return a boolean value, and 
     * will be unbinded when its return evaluates to false.
     * @param interval in seconds, how often it should be run
     * @param func The function to be binded.
     */
    public bindFunction(interval: number, func: Function) {

        if (this.bindedFunctions.has(interval)) {   //if a function on that interval already exists
            this.bindedFunctions.get(interval).push(func);
            if (interval > this.highestBindedInterval) {
                this.highestBindedInterval = interval;
                Util.myLogger("function binded, added");
            }
        }
        else {

            this.bindedFunctions.set(interval, [func]);
            if (interval > this.highestBindedInterval) {
                this.highestBindedInterval = interval;
                Util.myLogger("function binded")
            }
        }
    }
    
    private evaluateBindedFunctions() {
        let bFunc: any;  //Type errors were annoying me, I can't specify returns of functions in an array 
        let result: boolean;
        let functionName: string;
        let index: number;
        let functionsOnInterval: Function[] = null;

        Util.myLogger("in evaluation function");


        for (const [key, funcs] of this.bindedFunctions.entries()) { //iterate through every interval/functionList pair in the object
            Util.myLogger("Evaluating functions on key" + key + " at timestamp" + this.timestamp);
            if (this.timestamp%key === 0) { //process functions on this interval
                Util.myLogger("funcs here" + funcs);
                functionsOnInterval = funcs;
                Util.myLogger("eval func1");
                for (bFunc of functionsOnInterval) {
                    functionName = bFunc.name;
                    Util.myLogger("Evaluating function " + functionName);
                    result = bFunc();
                    if (result === false) {
                        index = functionsOnInterval.findIndex((entry) => entry.name === functionName);
                        functionsOnInterval.splice(index, 1);   //need to account for possible new highest binded interval
                    }
                }
            }

        }
        
    }

    /**
     * Added an emitter so other functions can subscribe to new timestamps and time themselves accordingly.
     */
    private addSeconds(): void {   //Do the if statement evaluations cause a delay and lead to incorrect time?
        
        this.timestamp++;
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
export = MyTimestamper;