//import events = require('events');  //Allows the object to emit events
//https://www.tutorialspoint.com/nodejs/nodejs_event_emitter.htm
import MyCircularLinkedList = require('./MyCircularLinkedListV2');    //A circular linked list will be used here to track the streamers.
import * as Clients from './index'; //imports twitch and discord client objects from main
import Discord = require('discord.js');
import config = require('./config/config-beta.json');
import MyTimestamper = require('./MyTimestamper');
import SimpleServerVarsManager = require('./SimpleServerVarsManager');
import Util = require('./MyDiscordUtils');

import EventEmitter from 'events';

//After initialization, checks status of listed streams continuously and post events when they go live

declare interface StreamChecker {
    on(event: "live", listener: (userName: string, associatedServers: string[]) => void): this;
    on(event: "ready", listener: Function): this;
}

/**
 * All in one class to manage stream checks, emits an event to notify other modules when a streamer goes live.
 */
class StreamChecker extends EventEmitter {
    private interval: number; //Controls the frequency of the streamcheck. A check is run every X seconds governed by the interval.  
    private checkList: MyCircularLinkedList<Streamer>;  //List of streamers to be checked. Streamers are removed from here for a period of time once they go live
    //private delay: number;  //Number of seconds to wait after a user goes live before posting. Not fully implemented
    private offlineMinimumDuration: number;    //minimum amount of time a streamer should be offline before their stream status can be checked again
    private timestamper: MyTimestamper; //Keeps track of seconds elapsed since this object was created.
    private iterator = MyCircularLinkedList[Symbol.iterator];   //Iterator to control the stream checker on the checkList 
    private running: boolean;   //tracks if the stream checker is running
    private runningInterval: NodeJS.Timeout;   //Points to the setInterval() timeout object so it can be easily stopped
    //myEmitter = new EventEmitter();

    constructor() {
        super();
        this.interval = config.STREAMCHECK_INTERVAL;
        this.checkList = new MyCircularLinkedList<Streamer>();
        this.checkList.setComparator(Streamer.comparator);
        this.timestamper = new MyTimestamper().start();
        this.offlineMinimumDuration = 0.1 * 60; //* 1000;    //1 minutes
        this.runningInterval = null;
        this.running = false;
    }

    /**
     * Starts the stream checker
     */
    public start(): StreamChecker {
        let generator = this.tick();
        console.log("Stream checking service started.");
        if (!this.running) {
            console.log("Confirmed service not running.");
            this.runningInterval = setInterval(() => {
                this.checkStreamerObject(generator.next().value);
            }
            , this.interval * 1000 );
            this.running = true;
        }
        return this;

    }

    /**
     * Asynchronously collects all the monitored streamers from every server the bot is a part of and 
     * initializes the stream checker with the results. Emits a ready event when complete.
     * TODO: return false if streamers were not collected, or throw exception?
     */
    public async collectStreamers() {
        let streamerNames: string[];
        console.time('streamCheckerCollection');
        console.log("Number of servers" + Clients.DiscordClient.guilds.size);

        //Object.entries() is the easiest way to iterate through a map https://stackoverflow.com/questions/16507866/iterate-through-a-map-in-javascript
        for (const [serverID, serverObject] of Clients.DiscordClient.guilds.entries()) {  //TODO: Remove serverObject if possible
            console.log("Scanning on server " + serverID);
            streamerNames = await SimpleServerVarsManager.getStreamers(serverID);
            console.log("attempting to add " + streamerNames + " as a streamer");

            if (streamerNames != null) {    //Remember to account for possible null values, spent an hour just on this bug
                for (let entry of streamerNames) {
                    let a = new Streamer(entry, serverID);
                    this.addStreamerObject(a);
                }
            }    
        }

        console.timeEnd('streamCheckerCollection');
        console.log("Scanned " + Clients.DiscordClient.guilds.size + " servers, streamers are " + this.checkList.toArray());
        this.emit('ready');    //posts that the checker is initialized
        
        return null;
    }

    /**
     * Supplied with streamer username and the associated server, adds to the check list
     *
     * @param {string} username Twitch username of streamer
     * @param {Discord.Snowflake} serverID Discord server ID
     * @memberof StreamChecker
     */
    public addStreamer(username: string, serverID: Discord.Snowflake): void {
        let newStreamerObject = new Streamer(username, serverID);
        this.addStreamerObject(newStreamerObject);
    }
    
    
    /**
     * Removes Discord server from a monitored streamer. If the monitored streamer no longer has any servers associated with them, removes them from the rotation.
     *
     * @param {string} username Twitch username of streamer
     * @param {Discord.Snowflake} serverID Discord server ID
     * @memberof StreamChecker
     */
    public removeStreamer(username: string, serverID: Discord.Snowflake): void {
        let streamerObj: Streamer = new Streamer(username, serverID);
        let target: Streamer = null;

        if (this.checkList.contains(streamerObj)) {
            target = this.checkList.fetch(streamerObj);
            target.removeAssociatedServer(serverID);
            if (target.getAssociatedServers.length < 1) {   //If the target streamer object no longer has any servers associated with it
                this.checkList.remove(streamerObj);
            }
        }
    }

    public addStreamerObject(streamerObject: Streamer) {
        console.log("checklist is now size " + this.checkList.getSize());
        if (this.checkList.contains(streamerObject)) {  //If the checklist already contains an entry for a streamer
            console.log("Checklist already contains " + streamerObject.toString()) ;
            let existingStreamer = this.checkList.fetch(streamerObject);

            for (let n of streamerObject.getAssociatedServers()) {  //adds each associated server from new object to the associated servers in the existing streamer 
                existingStreamer.addAssociatedServer(n); 
            }
        }
        else {
            this.checkList.addToEnd(streamerObject);
        }
        Util.myLogger("Checklist is now size " + this.checkList.getSize());
    }

    /**
     * Calculates the maximum notification delay for any given streamer, not including twitch api latency
     * TODO: Implement self-adjustment of interval to balance API calls frequency and delay based on list size 
     */
    public calculateMaximumDelay() {
        return this.interval * this.checkList.getSize();
    }

    //Unused for now
    private check() {
        let currentStreamer = this.iterator.next().value;    

        console.log("Checking up on " + currentStreamer.get);
        this.checkStreamerObject(currentStreamer);
    }

    /**
     * Experimenting with generator functions, should allow to iterate over the streamers contained within the stream checker module.
     * TODO: Generators can be paused, implement
     */
    private *tick() {
        for (let streamer of this.checkList) {
            console.log("Tick: pointing at " + streamer.getUsername() + " status: " + streamer.getStatus() + " last modified: " + streamer.getLastModified());
            yield streamer;
        }
        return null;    //Iterator on circular linked list never ends, just putting this here to satisfy the linter
    }


    private checkStreamerObject(streamerObject: Streamer) {
        Clients.TwitchClient2.getStream(streamerObject.getUsername())
            .then(data => {
                if (data && streamerObject.getStatus() === StreamStatus.OFFLINE) { //Stream is live and was previously offline
                    Util.myLogger("Stream detected. " + streamerObject.getUsername() + " has gone live.");
                    this.emit('live', streamerObject.getUsername(), streamerObject.getAssociatedServers(), data);
                    streamerObject.setStatus(StreamStatus.ONLINE, this.timestamper.getTimestamp());
                }

                else if (data && streamerObject.getStatus() === StreamStatus.ONLINE) { //Stream is live and was previously online
                    //this.emit('live', streamerObject.getUsername(), streamerObject.getAssociatedServers());
                    //streamerObject.setStatus(StreamStatus.ONLINE, this.timestamper.getTimestamp());
                }

                else if (!data && streamerObject.getStatus() === StreamStatus.ONLINE) { //Stream is offline and was previously online
                    Util.myLogger(streamerObject.getUsername() + " is closing down stream.");
                    this.emit('closing', streamerObject.getUsername(), streamerObject.getAssociatedServers());
                    streamerObject.setStatus(StreamStatus.CLOSING, this.timestamper.getTimestamp());
                }

                else if (!data && streamerObject.getStatus() === StreamStatus.CLOSING) { //Stream is offline and was previously closing
                    if (this.timestamper.getTimestamp() - streamerObject.getLastModified() > this.offlineMinimumDuration) {//if enough time has passed to consider the stream offline
                        console.log("time difference: " + (this.timestamper.getTimestamp() - streamerObject.getLastModified() ))
                        this.emit("offline", streamerObject);
                        Util.myLogger("Now offline: " + streamerObject.getUsername())
                        streamerObject.setStatus(StreamStatus.OFFLINE, this.timestamper.getTimestamp());
                    }
                }
            });
    }

    /**
     * Returns an array of all streamers being monitored
     *
     * @returns {Array<Streamer>}
     * @memberof StreamChecker
     */
    public toArray(): Array<Streamer>{
        return this.checkList.toArray();
    }
}

class Streamer  {
    
    private username: string;
    private streamStatus: StreamStatus;
    private lastModified: number;
    private associatedServers: Discord.Snowflake[];    //Set of servers requesting monitoring of this streamer.
    
    constructor(username: string, server: Discord.Snowflake) {
        this.username = username;
        this.associatedServers = [server];
        this.streamStatus = StreamStatus.OFFLINE;
        this.lastModified = 0;
    }


    public getUsername(): string {
        return this.username;
    }

    public setStatus(status: StreamStatus, timestamp: number): Streamer {
        this.streamStatus = status;
        this.lastModified = timestamp;
        return this;
    }

    public getStatus(): StreamStatus {
        return this.streamStatus;
    }

    public getLastModified(): number {
        return this.lastModified;
    }
    
    public getAssociatedServers(): Discord.Snowflake[] {
        return this.associatedServers;
    }

    public addAssociatedServer(server: Discord.Snowflake) {
        if (!this.associatedServers.includes(server)) {
            this.associatedServers.push(server);
        }
    }

    public removeAssociatedServer(server: Discord.Snowflake) {
        if (this.associatedServers.includes(server)) {
            this.associatedServers.splice(this.associatedServers.indexOf(server), 1);   //removes the item from the array
        }
    }

    public toString() { //have to override for comparison in other js functions to make any sense, sadly too difficult to make my own interface and enforce it
        return this.username;
    }

    public getDescription() {
        return this.username + " at " + this.associatedServers;
    }
    static comparator(s1: Streamer, s2: Streamer): boolean {
        return s1.username === s2.username;
    }
}

enum StreamStatus {
    ONLINE = 'ONLINE',
    CLOSING = 'CLOSING',
    OFFLINE = 'OFFLINE',
}
export = StreamChecker;