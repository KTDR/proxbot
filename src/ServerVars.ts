import Discord = require("discord.js");
import Util = require('./MyDiscordUtils');
const VERSION = "v1";
//const methods = ServerVariables.prototype; //Easier to define methods for the object this way
//TODO: Anonymous inner classes to extend variables and add properties that way
//TODO: Throw exceptions when a change is not authorized, here or in the manager
//To identify constants, check for a variable name in all caps

/** 
 * First attempt at variable storage per server. Using an "object" to store all values, and basic functions, using a separate manager object for
 * more complex functions
 */
class ServerVariables {
    //fields, default values assigned only in the constructor to maintain order
    readonly OBJECT_VERSION: string; //the readonly modifier is typescript specific
    readonly SERVER_ID: string; 
    authorization_level: number;
    enablePurge: boolean;
    streamers: string[];    //List of streamers to monitor
    alertMessage: string;   //alert message to be used when posting a stream notification
    enableMemberNotifications: boolean;
    botRole: string;
    prefix: string;
    streamAlertType: string;

    /**
     * Constructor for the class, all values initialized here for ordering
     * @param {Discord.Guild} server Discord server for this config 
     */
    constructor(server: Discord.Guild) {
        this.OBJECT_VERSION = VERSION;
        this.SERVER_ID = server.id;
        this.authorization_level = 0; 
        this.enablePurge = false;
        this.streamers = null;
        this.alertMessage = null;
        this.enableMemberNotifications = false;
        this.botRole = "bot-admin";
        this.streamAlertType = "@here";
        this.prefix = '!';
    }

    /**
     * Setter for enablePurge property
     */
    setPurge(value: boolean, auth: number): boolean {
        let processed = false;
        if (this.authorization_level >= auth){
            this.enablePurge = value;
            processed = true;
        }
        return processed;        
    }

    /**
     * Setter for member notification property
     */
    setMemberNotifications(value: boolean, auth: number): boolean {
        let processed = false;
        if (this.authorization_level >= auth){
            this.enableMemberNotifications = true;
            processed = true;
        }
        return processed;
    }

    /**
     * Setter for streamers
     * TODO: Auto format to web address
     */
    setStreamers(streamers: string[], auth: number) {
        let processed = false;

        if (this.authorization_level >= auth) {
            if (streamers[0] === "null") {
                this.streamers = null;
                processed = true;
            }
            else if (streamers.length <= 4) {    //Streamers list must be less than 4
                this.streamers = streamers;
                processed = true;
            }
            else {
                processed = false;
            }
        }
        return processed;
    }

    setAlertMessage(message: string, auth: number) {
        let processed = false;
        if (this.authorization_level >= auth) {
            if (message === "null") {
                this.alertMessage = null;
                processed = true;
            }
            else if (message.length < 120) {
                this.alertMessage = message;
                processed = true;
            }
        }
        return processed;

    }
    /**
     * Setter for bot role
     */
    setBotRole(value: string, auth: number): boolean {
        let processed = false;
        if (this.authorization_level >= auth){
            this.botRole = value;
            processed = true;
        }
        return processed;
    }

    /**
     * Setter for command prefix
     */
    setPrefix(value: string, auth: number): boolean {
        let processed = false;
        if (this.authorization_level >= auth){
            if (value.length === 1) {
                this.prefix = value;
                processed = true;
            }
        }
        return processed;
    }

    /**
     * Setter for stream alert type
     * @param alert String for new value, either here or everyone
     * @param auth current authorization level for this command
     */
    setStreamAlertType(alert: string, auth: number): boolean {
        let processed: boolean = false;
        alert = alert.toLowerCase().replace('@', '');
        if (this.authorization_level >= auth) {
            if (alert === "here" || alert === "everyone") { //only 2 valid values for this property
                this.streamAlertType = '@' + alert;
                processed = true;
            }
        }
        return processed;
    }


    /**
     * Setter for server authorization level. Not to be accessible to anyone other than bot owner.
     */
    setAuthorizationLevel(level: number): void {
        this.authorization_level = level;
    }
}

export = ServerVariables;
