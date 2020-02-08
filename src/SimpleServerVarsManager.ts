import Discord = require('discord.js'); //For type definitions TODO: Ensure this is not being loaded in the compiled .js file as it is not used in runtime here
import config = require('./config/config-beta.json');
//import client = require("./index.js"); //Imports the logged in client from the main file TODO: Find a cleaner way to do this
import {DiscordClient as client} from "./index";

import ServerVars = require('./ServerVars');
import Cache = require('./cache/configMessageCache.json');
import fs = require('fs');  //so the cache file can be written to the local system
//import path = require('path'); //for resolving path names https://stackoverflow.com/questions/3133243/how-do-i-get-the-path-to-the-current-script-with-node-js
//import VariableAuthorizations = require('./config/variable-authorizations.json'); //Doesn't seem to work well with typescript //SOLVED: fixed in tsconfig.json, although typescript doesnt recognize bracket notation
import {auths as VariableAuthorizations} from "./config/variable-authorizations.json";
import {info as VariableInformation} from "./config/variable-authorizations.json"  ;    //TODO: Refactor code below and import these both as one, rename file
import Util = require("./MyDiscordUtils");
import MyTwitchModule = require('./MyTwitchModule');
import EventEmitter from 'events';
import MyHashSet from './MyHashSet';
//TODO URGENT: Have authorizations master file saved locally, most up to date reference for variable authorizations can be changed at any time without reboot
//TODO: Add config message ID caching to reduce fetchMessages() calls as they get me rate limited, also add function to clean up cache list of removed servers at owner's invocation
//TODO: Refactor load/save functions so they call a single function after determining if a config message is cached.
//TODO: Consider enable/disable commands with string of all disabled commands, separated by comma or |
//TODO: Split code into more functions, too many repeated blocks
//TODO: Optimize, only edit config message if variable was changed.

//Declaring structure of event emissions so other modules know what to expect
declare interface SimpleServerVarsManager {
    on(event: "newstreamers", listener: (names: string[], serverID: Discord.Snowflake) => void): this;
    on(event: "removedstreamers", listener: (names: string[], serverID: Discord.Snowflake) => void): this;
}

/**
 * "Simple" server variables manager for on-server variable storage. Does not account for server permissions, 
 * version mismatches, or user error that could compromise variable storage. I just needed to get something working. Needs 
 * to be refactored 
 */
 class SimpleServerVarsManager extends EventEmitter {
    vars: ServerVars;  //Contains the actual variables for the discord server
    serverID: string; //String that holds the server ID
    valid: boolean;    //Flags if this object is properly instantiated, false until contents are verified
    
    constructor(server: Discord.Guild) {
        super();    //Construct the emitter
        this.serverID = server.id;
        this.vars = new ServerVars(server);
        this.valid = false;
    }

    /**
     * Sets up the manager object, should be run after the constructor
     */
    public async setup() {
        await this.loadConfig() //doesn't proceed until config is finished loading
            .then(loaded => {
                if (loaded === false) {  //If config could not be loaded from server for any reason
                    console.log("failed to load config in the setup method.");
                    this.generateBlankConfig(); //loads a blank config
                    this.valid = true;
                }
                else if (this.vars !== undefined && this.vars !== null) { //If config was loaded, 
                    this.valid = true;
                }
                else {  //if config could not be loaded or generated
                    this.valid = false;
                }
            });
    }

    /**
     * Returns a string array of usernames of all streamers monitored on a specified Discord server.
     *
     * @static
     * @param {Discord.Snowflake} serverID ID of server to get streamers from
     * @returns {Promise<string[]>} String array of all the streamer usernames monitored for the server
     * @memberof SimpleServerVarsManager
     */
    static async getStreamers(serverID: Discord.Snowflake): Promise<string[]> {
        let serverObject: Discord.Guild = SimpleServerVarsManager.getServerObject(serverID);
        let tempVars = new SimpleServerVarsManager(serverObject);  //This probably isn't the most efficient way of getting a single variable TODO: Find a better solution
        await tempVars.setup();

        return tempVars.vars.streamers;
    }

    /**
     * Gets the variables from the server and stores it in the vars field
     * @param server 
     * @returns True if the variables were found and loaded, false otherwise
     * TODO: Refactor the logic, too many identical if statements
     */
    private async loadConfig(server: Discord.Guild = SimpleServerVarsManager.getServerObject(this.serverID)): Promise<boolean> {  //TODO: Clean these parameters up
        console.log("Loading config from server: " + server);
        let success: boolean = false; //TODO: Refactor how function ends/returns
        let configChannel: Discord.TextChannel = undefined;
        let configMessage: Discord.Message;
        let configString: string;
        let tempObject: ServerVars;

        configChannel = server.channels.find(c => c.name.toLowerCase() === 'bot-config' && c instanceof Discord.TextChannel) as Discord.TextChannel;
        if (configChannel === undefined || configChannel === null) {
            console.log("Couldn't find a bot-config channel to load from");
            success = false;
        }
        else if (this.serverID in Cache) {
            await configChannel.fetchMessage(Cache[this.serverID])
                    .then(message => configMessage = message)
                    .catch(error => console.log(error));

            if (configMessage == undefined) {    //temporary fix 
                return false;
            }

            //Load config string depending on if it is in a rich embed or not
            if (configMessage.embeds[0].description.startsWith("```json")) {
                configString = configMessage.embeds[0].description;
            }
            else {
                configString = configMessage.content;
            }
            
            if (configString.startsWith("```json") && configString.endsWith("```") ) {  //just checks that the message contains a json code block
                configString = configString.replace("```json","").replace("```","");//.trim();
                //console.log("configString in load config   " + configString);
                tempObject = JSON.parse(configString.trim());
                //console.log("tempobj in load config" + tempObject);
                console.log("tempobj type in load config " + typeof(tempObject))

                if (true) { //Checks that the object received is at least an instance of serverVars object, TODO: version checks
                    this.vars = new ServerVars(server);
                    Object.assign(this.vars, tempObject);
                    //this.setPrefix("%");    //TESTING TODO URGENT: REMOVE BEFORE DEPLOY
                    success = true; //Now that the object has been retreived from the server and stored in program memory
                }
            }
        }
        else { //If the config message isnt cached yet
            console.time("loadConfigFetch");
            await configChannel.fetchPinnedMessages()   //Doesn't proceed until all pinned messages are collected
                .then(messages => {
                    console.timeEnd("loadConfigFetch");
                    configMessage = messages.first();
                    if (configMessage == undefined) {   //temporary fix awaiting refactor
                        return false;
                    }
                    console.log("In load config, found " + messages.size + " pinned messages.");
                    //console.log("Config message description:", configMessage.embeds[0].description);
                    
                    if (configMessage !== null && configMessage !== undefined) {    //if the config message exists

                        //Load config string depending on if it is in a rich embed or not
                        if (configMessage.embeds[0].description.startsWith("```json")) {
                            configString = configMessage.embeds[0].description;
                        }
                        else {
                            configString = configMessage.content;
                        }

                        if (configString.startsWith("```json") && configString.endsWith("```") ) {  //just checks that the message contains a json code block
                            console.log("Confirming message contains a json code block.");
                            configString = configString.replace("```json", "").replace("```","").trim();
                            tempObject = JSON.parse(configString.trim());
            
                            if (true) { //Checks that the object received is at least an instance of serverVars object, TODO: version checks
                                this.vars = new ServerVars(server);
                                Object.assign(this.vars, tempObject);
                                //this.setPrefix("%");    //TESTING
                                this.saveCache(configMessage.id);
                                success = true; //Now that the object has been retreived from the server and stored in program memory
                            }
                        }
                        else {
                            success = false;
                        }
                    }
                })
                //.then(messages => console.log("pinned messages   " + messages))
                .catch(error => console.log("Couldn't fetch pinned messages,", error));
        }
        return success;
    }

    /**
     * Creates a server variables object with the default values and posts it to the bot-config channel.
     * Returns true if the message was posted successfully, false otherwise.
     */
    private async generateBlankConfig(server: Discord.Guild = SimpleServerVarsManager.getServerObject(this.serverID), rich: boolean = true): Promise<boolean> {
        let success: boolean = false;
        let blankVars: ServerVars = new ServerVars(SimpleServerVarsManager.getServerObject(this.serverID));
        let configChannel: Discord.TextChannel = undefined;
        let startString: string = "```json\n";
        let endString: string = "\n```";
        let embed: Discord.RichEmbed;

        configChannel = await server.channels.find(c => c.name.toLowerCase() === 'bot-config' && c instanceof Discord.TextChannel) as Discord.TextChannel;

        if (configChannel === undefined || configChannel === null) {  ///if config channel was not found
            success = false;
        }
        else {
            if (!rich) {
                configChannel.send(startString + JSON.stringify(blankVars, null, 1) + endString)
                    .then((sentConfigMessage: Discord.Message) => {
                        sentConfigMessage.pin();  //Safe to assume that it will be a single message since message split is not enabled by default
                        this.saveCache(sentConfigMessage.id);
                        success = true; //Since message was successfully posted
                    })
                    .catch(console.error);
            }
            else {
                embed = new Discord.RichEmbed();

                configChannel.send(this.buildRichConfig())
                    .then((sentConfigMessage: Discord.Message) => {
                        sentConfigMessage.pin();  //Safe to assume that it will be a single message since message split is not enabled by default
                        this.saveCache(sentConfigMessage.id);
                        success = true; //Since message was successfully posted
                    })
                    .catch(console.error);
            }
        }
        console.log("Generated blank config for server ", server.name);
        return success;
    }

    /**
     * Saves the current config to the server, by editing the current config message
     */
    public async saveConfig(server: Discord.Guild = SimpleServerVarsManager.getServerObject(this.serverID)): Promise<boolean> {
        let success: boolean = false;
        let configChannel: Discord.TextChannel = undefined;
        let configMessage: Discord.Message = undefined;
        let startString: string = "```json\n";
        let endString: string = "\n```";
        
        configChannel = await server.channels.find(c => c.name.toLowerCase() === 'bot-config' && c instanceof Discord.TextChannel) as Discord.TextChannel; //Await may not be necessary
        if (this.serverID in Cache) { //If the ID of the config message is already in cache
            configMessage = await configChannel.fetchMessage(Cache[this.serverID]);
                if (configMessage !== undefined && configMessage !== null) {  ///if config message was found
                    if (configMessage.embeds[0].description.startsWith("```json")) { //if the config message is a rich embed type
                        console.time("richConfigMessageSave");
                        configMessage.edit(this.buildRichConfig()) 
                            //.then((sentConfigMessage: Discord.Message) => sentConfigMessage.pin())  //Safe to assume that it will be a single message since message split is not enabled by default
                            .then((editedMessage: Discord.Message) => {
                                this.saveCache(editedMessage.id);
                                success = true;  //Since message was successfully edited
                                console.timeEnd("configMessageSave");
                            })
                            .catch(error => console.log("couldn't edit my rich embed, " + error));
                    }
                    else {
                        console.time("configMessageSave");
                        configMessage.edit( startString + JSON.stringify(this.vars, null, 1) + endString ) //last parameter for pretty printing
                            //.then((sentConfigMessage: Discord.Message) => sentConfigMessage.pin())  //Safe to assume that it will be a single message since message split is not enabled by default
                            .then((editedMessage: Discord.Message) => {
                                this.saveCache(editedMessage.id);
                                success = true;  //Since message was successfully edited
                                console.timeEnd("configMessageSave");
                            })
                            .catch(error => console.log("couldn't edit my message, " + error));
                    }
                    
                }
        }
        else {
            await configChannel.fetchPinnedMessages()
            .then(messages => {
                configMessage = messages.first();
                if (configMessage !== undefined && configMessage !== null) {  ///if config message was found
                    
                    if (configMessage.embeds[0].description.startsWith("```json")) { //if the config message is a rich embed type
                        console.time("richConfigMessageSave");
                        configMessage.edit( this.buildRichConfig() ) 
                            //.then((sentConfigMessage: Discord.Message) => sentConfigMessage.pin())  //Safe to assume that it will be a single message since message split is not enabled by default
                            .then((editedMessage: Discord.Message) => {
                                this.saveCache(editedMessage.id);
                                success = true;  //Since message was successfully edited
                                console.timeEnd("richConfigMessageSave");
                            })
                            .catch(error => console.log("couldn't edit my message, " + error));
                    }
                    
                    else {
                        console.time("configMessageSave");
                        configMessage.edit( startString + JSON.stringify(this.vars, null, 1) + endString ) //last parameter for pretty printing
                            //.then((sentConfigMessage: Discord.Message) => sentConfigMessage.pin())  //Safe to assume that it will be a single message since message split is not enabled by default
                            .then((editedMessage: Discord.Message) => {
                                this.saveCache(editedMessage.id);
                                success = true;  //Since message was successfully edited
                                console.timeEnd("configMessageSave");
                            })
                            .catch(error => console.log("couldn't edit my message, " + error));
                    }
                    
                }
            })
            .catch(error => console.log("Couldn't find a config message " + error));
        }
        
        return success;
    }

    /**
     * Method that reads a server ID and returns an object of the server. returns null
     * if server was not found or the bot isn't a member.
     */
    public static getServerObject(id: string): Discord.Guild {
        let locatedServer: Discord.Guild = null;
        locatedServer = client.guilds.get(id);
        return locatedServer;
    }

    /**
     * Generates the proper stream alert according to settings for this server
     * @param streamerName Twitch username for livestream
     * @param message Message to be used to generate the stream alert content
     */
    public generateStreamAlertMessage(streamerName: string, message: string = this.vars.alertMessage): string {
        let newString: string = this.vars.streamAlertType + ', ';

        if (message == null) {
            newString += "[NAME] is now live at [LINK] ! Go check it out!";
        }
        else {
            newString += message;
        }
        newString = newString.replace('[NAME]', streamerName).replace('[LINK]', 'https://www.twitch.tv/' + streamerName.trim());
        
        return newString;
    }


    private getCachedMessageID(serverID: Discord.Snowflake): Discord.Snowflake {
        let messageID: Discord.Snowflake = null;

        if (Cache[serverID]) { //if there is a key for the specified server ID
            messageID = Cache[serverID];
        }
        return messageID;
    }

    /**
     * Generates and returns a rich embed config for the specified server Rich embed total character limit is 6000
     * @param server Server to make a rich embed config for
     */
    private buildRichConfig(server: Discord.Guild = SimpleServerVarsManager.getServerObject(this.serverID)): Discord.RichEmbed {

        let myEmbed = new Discord.RichEmbed()
            .setTitle("_Configuration file for server " + server.name + ':_')
            //cannot display local files in the thumbnail,, can attach first though https://stackoverflow.com/questions/46734519/how-to-use-local-file-as-thumbnail-in-discordjs-embedded-message
            .setThumbnail("https://cdn.discordapp.com/attachments/572600145615519786/572600284992372756/rich_config_thumbnail_1.png") 
            .setColor(15601303)
            .setDescription(Util.codeblockWrap(JSON.stringify(this.vars, null, 1), 'json'))
            .setFooter("Config for " + config.BOT_NAME_VERSION, client.user.avatarURL); 
            //Automatically adds necessary fields for variable info in the rich embed
            Object.keys(VariableInformation).forEach(function(key) {
                myEmbed.addField(key, VariableInformation[key])
            });
        
        return myEmbed.setTimestamp();
    }
    /**
     * Updates the in-memory cache then saves the data to a file.
     * @param messageID ID of the config message
     */
    private saveCache(messageID: Discord.Snowflake) {
        if (Cache[this.serverID] !== messageID) {   //Minimize writes, only saves the in-memory object if there is new data
            Cache[this.serverID] = messageID;
            //fs.writeFile(path.resolve(__dirname, 'configMessageCache.json'), JSON.stringify(Cache, null, 4), error => console.log(error));
            fs.writeFile(__dirname + '/cache/configMessageCache.json', JSON.stringify(Cache, null, 4), error => console.log(error));
            console.log("----------wrote to cache file, dirname is " + __dirname);
        }
    }

    /**
     * Returns a client object from the logged in discord client in the index. Had to be delayed as it was importing before client was logged in.
     * Not sure if this was the best way to do it.
     */
    private getDiscordClient(): Discord.Client {
        let index = require('./index');
        console.log("loaded client" + index.DiscordClient);
        return index.DiscordClient;
    }
    

    /**
     * Allows changing of values directly by name. Experimental
     * @param name name of the server value to be changed, case sensitive for now
     */
    public changeVariable(name: string, value: any): boolean {
        let processed: boolean = false;
        let functionName: string = '';
        //let methods = Object.getOwnPropertyNames(this).filter(p => {return typeof this[p] === 'function'}); //https://stackoverflow.com/questions/2257993/how-to-display-all-methods-of-an-object
        let methods = Object.getOwnPropertyNames(SimpleServerVarsManager.prototype);
        console.log(methods.toString());
        name = "set" + name[0].toUpperCase() + name.substring(1); //capitalize the first letter of the variable name to correct for setter
        console.log("NEW NAME " + name +  " value is "+ value);
        console.log(name + "   " + methods);
        console.log(name in methods)

        //For some reason using the "in" operator wouldn't work with a string and a string array
        if (methods.find(methodName => methodName === name)) {
            console.log("FOUND NAME IN METHODS");
            processed = this[name](value);  //TODO: Clear up what this does
        }

        return processed;
    }

    
    //METHODS TO CHANGE VARIABLES BELOW:
    //TODO: Find a safe way to change any variable based on name, if possible
    //TODO: Setup an interface for each object version?

    public setEnablePurge(value: boolean): boolean {
        let processed: boolean = false;
        value = Util.booleanParser(value);  //ensures value is a boolean

        if (value !== undefined) {    //Checks that an undefined value was not parsed
            processed = this.vars.setPurge(value, VariableAuthorizations.enablePurge);  //changes value in memory
        }
        
        if (processed) {
            this.saveConfig();  //if value in memory changed, write new object to config on server
        }
        
        return processed;
    }

    public async setStreamers(streamers: string): Promise<boolean> {
        let oldMap = new MyHashSet<string>().addAll(this.vars.streamers);  //Set of streamers currently monitored on server requesting change
        let addedMap = new MyHashSet<string>();   //Set of streamers to be added to the server watch list
        let newStreamers = [], removedStreamers = []; //Tracks streamers removed and added to help the streamchecker
        let myList = streamers.split(',');
        let TwitchClient = new MyTwitchModule.Client();
        let processed: boolean = false;
        
        if (streamers.length < 3) { //disregard nonsense input
            processed = false;
        }
        else if (myList[0] === "null") { //TODO: rework how streamer list is cleared.
            processed = this.vars.setStreamers(myList, VariableAuthorizations.streamers);
        }
        else {
            for (let i = 0; i < myList.length; i++) {
                await TwitchClient.getTwitchUsername(myList[i])
                    .then(resolvedName => {
                        if (resolvedName) { //if a streamer with that name was found
                            addedMap.add(resolvedName);
                        }
                    });
            }
            processed = this.vars.setStreamers(addedMap.toArray(), VariableAuthorizations.streamers);
        }
        
        if (processed) {    //Streamer list was succesfully updated on server
            this.saveConfig();  //Starts the process of writing new config to the server

            newStreamers = addedMap.subtract(oldMap).toArray();  //Get streamers that were added that weren't previously being watched on this server
            removedStreamers = oldMap.subtract(addedMap).toArray(); //Get streamers that were previously being watched and weren't added back.

            if (newStreamers.length > 0) {
                this.emit('newstreamers', newStreamers, this.serverID);
            }
            if (removedStreamers.length > 0) {
                this.emit('removedstreamers', removedStreamers, this.serverID);
            }
        }
        return processed;
    }
    public setAlertMessage(message: string): boolean {
        let processed = this.vars.setAlertMessage(message, VariableAuthorizations.botRole);
        if (processed) {
            this.saveConfig();
        }
        return processed;
    }

    public setEnableMemberNotifications(value: boolean): boolean {
        let processed: boolean = false;
        value = Util.booleanParser(value);  //ensures value is a boolean

        if (value !== undefined) {    //Checks that an undefined value was not parsed
            processed = this.vars.setMemberNotifications(value, VariableAuthorizations.enablePurge);  //changes value in memory
        }
        
        if (processed) {
            this.saveConfig();  //if value in memory changed, write new object to config on server
        }
        
        return processed;

    }

    public setBotRole(roleName: string): boolean {
        let processed = this.vars.setBotRole(roleName, VariableAuthorizations.botRole);
        if (processed) {
            this.saveConfig();
        }
        return processed;
    }

    public setPrefix(newPrefix: string): boolean {
        let processed = this.vars.setPrefix(newPrefix, VariableAuthorizations.prefix);
        if (processed) {
            this.saveConfig();
        }
        return processed;
    }

    public setStreamAlertType(newPrefix: string): boolean {
        let processed = this.vars.setStreamAlertType(newPrefix, VariableAuthorizations.prefix);
        if (processed) {    //TODO: Move validation check to manager
            this.saveConfig();
        }
        return processed;
    }

    /**
     * DO NOT MAKE ACCESSIBLE TO ANY USERS
     * @param level 
     */
    public setAuthorizationLevel(level: number): void {
        this.vars.setAuthorizationLevel(level);
        this.saveConfig();
    }
 }
 export = SimpleServerVarsManager;