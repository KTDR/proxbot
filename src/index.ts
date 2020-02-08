//require('app-module-path').addPath(__dirname); //Makes managing file paths MUCH easier, https://github.com/patrick-steele-idem/app-module-path-node
import config = require("./config/config-beta.json"); //imports server and user specific variables from external file  //import added so the typescript compiler adds it to /build/config
import adminConfig = require('./config/config-admin.json'); //admin settings
import Discord = require("discord.js");  //imports Discord client class TYPESCRIPT SPECIFIC https://www.typescriptlang.org/docs/handbook/modules.html
import SimpleServerVarsManager = require("./SimpleServerVarsManager");  //TODO: Move server values to separate module so it can be accessed more readily
import MyTwitchModule = require('./MyTwitchModule');
import Util = require('./MyDiscordUtils') ; //importing frequently used functions TODO: Possibly import this into global namespace?
import fs from "fs";   //imports node.js module that allows read/write of files
import MyTimestamper = require('./MyTimestamperV2');    // REVERT: Revert to first version if problems arise
import StreamChecker = require('./Streamchecker');
import MyHRTimer from './MyHRTimer';    //Helps measure execution times

const ENABLE_TESTING: boolean = false;   //for quick testing in the console
//const sizeFunc = require("./memorySizeOfObject.js");   //imports function to get size of object, credits listed in source file. 

const client = new Discord.Client();    //initializes discord.js client object

const twitch2 = new MyTwitchModule.Client();
const DiscordTimestamper: MyTimestamper = new MyTimestamper();   //Creates an object to approximate the Discord API timestamp, avoiding constant queries TODO: monitor possible drift
const StreamCheck = new StreamChecker();   

var owner: Discord.User = undefined;   //to hold discord user object for bot owner, user ID hardcoded into config.json for now.
var ServerValues: SimpleServerVarsManager;  //reserves server vars variable to be used by the program for server specific settings 

connectionManager("login"); //initial discord bot login

client.on('ready', () => {  //activates when bot starts up, and logs its name to the terminal
    DiscordTimestamper.changeTimestamp(client.readyTimestamp).start();   //Starts tracking Discord API timestamp
    client.fetchUser(config.owner)  //finds specified bot owner by user ID
        .then(user => owner = user) //stores desired bot owner as a discord user object into the owner variable
        .then(user => console.log("Owner set to " + owner.username))
        .then(user => console.log("Active in " + client.guilds.size + " servers."))
        .catch((error: string) => console.log("Could not locate specified bot owner due to error " + error));
    console.log(`Logged in as ${client.user.tag}!`);
    Util.myLogger(`Logged in as ${client.user.tag}!`);
    
    console.time('invitelinkclient');
    client.generateInvite()
        .then(link => {
            console.log("Invite link: " + link);
            console.timeEnd('invitelinkclient');    //Log the delay when getting invite link from Discord API 
        });
    setActivity();

    //Post-login initialization steps here
    MyHRTimer.startTime('collectStreamers');
    StreamCheck.collectStreamers(); //Ideally this would be blocking but takes too long to iterate over all the servers and get the data
    
});

//When streamers need to be added to the check rotation
ServerValues.on('newstreamers', (names: string[], serverID: Discord.Snowflake) => {
    for (let name of names) {
        StreamCheck.addStreamer(name, serverID);
    }
});

//When streamers need to be removed from the check rotation
ServerValues.on('removedstreamers', (names: string[], serverID: Discord.Snowflake) => {
    for (let name of names) {
        StreamCheck.removeStreamer(name, serverID);
    }
});

StreamCheck.on('ready', () => {
    Util.myLogger("Index received ready event. Collecting streamers took " + MyHRTimer.endTimeMs('collectStreamers').toFixed(2) + 'ms');
    StreamCheck.start();
});

//When a streamers goes live, issue notifications to servers
StreamCheck.on('live', async (userName, associatedServers) => {
    Util.myLogger(`Streamer ${userName} has gone live. Notifying ${associatedServers.length} servers. `);
    let serverSettings: SimpleServerVarsManager;
    let message: string;
    let serverObject: Discord.Guild;
    let streamObject: MyTwitchModule.Stream;
    let streamerObject: MyTwitchModule.User;
    let gameObject: MyTwitchModule.Game;
    
    for (let serverID of associatedServers) {
        serverObject = SimpleServerVarsManager.getServerObject(serverID);
        serverSettings = new SimpleServerVarsManager(serverObject);
        message = serverSettings.generateStreamAlertMessage(userName);

        let promise1 = twitch2.getStream(userName);
        let promise2 = twitch2.getUserObject(userName);

        await Promise.all([promise1, promise2]).then(values => {
            streamObject = values[0];
            streamerObject = values[1];
            }
        );

        await twitch2.getGameObject(streamObject.game_id)
            .then(game => { 
                gameObject = game;
                Util.myLogger(message);
                Util.findTextChannel(serverObject,'stream-notifications').send(message, streamEmbed(streamObject, streamerObject, gameObject));
                //TODO: Fix above to post to user-defined notification channel
            }
        );
    }

});

client.on('reconnecting', () => { //Emitted when client tries to auto reconnect.
    console.log("No connection to Discord API. Client auto-reconnecting.");
});

client.on('disconnect', () => { //Emitted when the client's WebSocket disconnects and will no longer attempt to reconnect.
    console.log("Client could not connect to Discord API. Reconnecting at next opportunity.");
    let attempts: number = 0;
    setInterval(() => connectionManager("refresh"), (attempts < 60 ? ++attempts : attempts));  //each attempt increases the delay on the next one, up to a limit

});


//TODO: Separate each block of command logic into it's own function, with message object passed as parameter
//event listener for messages
client.on('message', async (msg: Discord.Message) => {  

    if (msg.author === owner || msg.member.roles.some(role => role.name.toLowerCase() === "bot admin")) { //Only responds to messages from the specified owner, or someone with the bot admin role.

        if (!msg.guild || msg.author.bot || msg.content.charAt(0) !== config.prefix)  {
            return; // Ignore messages that aren't from a guild, are from a bot, or don't start with the specified prefix 
        }

        await loadServerValues(msg.guild);    //initializes server variables for the server this message is in
        //Separates the command name from the arguments
        const args = msg.content.slice(config.prefix.length).trim().split(" ");
        const command = args.shift().toLowerCase(); //shift() returns and removes first element of array
        let active = true;

        if (ServerValues.valid === false) {
            msg.reply("Please setup a config channel to use my features. I can do this for you with the !regenerateConfig command if I have the proper permissions.");
            active = false;
        }

        if (command === 'ping' && active) {   //fires if message is ping

            MyHRTimer.startTime('commandPing');
            const m = await msg.reply("Ping?") as Discord.Message;
            m.edit("Pong! Latency is " + (m.createdTimestamp - msg.createdTimestamp) 
                + "ms. API Latency is " + Math.round(client.ping) 
                + "ms. Internally measured latency is " 
                + MyHRTimer.endTimeMs('commandPing').toFixed(2) + 'ms. '+ config.BOT_NAME_VERSION);
        }

        if (command === 'runlatencytest') { //very basic latency testing works similarly to the !ping command
            latencyTesting(msg, args);            
        }

        //TODO: Synchronize the local timestamp with the one from the discord servers. Returns the difference so clock drift can be measured.
        if (command === 'synctime') {
            msg.reply("Not yet implemented!");
        }

        //Returns link to avatar of user if no args, otherwise returns link to avatar specified by provided userID //TODO: Implement this upstream and make it find users by @mentions
        if (command === "avatar" && active) {   
            if (args.length > 0) {
                client.fetchUser(args[0])
                    .then(user => msg.reply(user.avatarURL))
                    .catch(error => msg.reply("Cannot find user, error: " + error));
            }
            else {
                msg.reply(msg.author.avatarURL);
            }
        }

        //Echo command, used to have the bot send a message in a specified channel.
        if (command === "echo" && active) {
            if (args.length >= 2) {
                const targetChannel = msg.guild.channels.find(ch => ch.name === args[0]) as Discord.TextChannel;   //find a channel with name matching the first arg. 
                if (targetChannel) {    //if desired channel was found/exists
                    targetChannel.send(args.slice(1, args.length).join(" ")); //Reconnects arguments to form original message. Test for handling of multiple spaces. Consider storing original string.
                }
                else {
                    msg.reply("Specified channel " + "\"" + args[0] + "\" not found. Check that the channel exists and I have access to it.");
                }
            }
            else {
                msg.reply("You can use this command to have me send a message in a specified channel. Just specify the channel name in the first argument and follow with your message.");
            } 
        }

        //Prints info about the channel this command is called in.
        if (command === "channelinfo" && active) {   
            const channel = msg.channel as Discord.TextChannel; //Casts guild channel object as a text channel https://acdcjunior.github.io/typescript-cast-object-to-other-type-or-instanceof.html
            var info = [];

            //TODO: Try to add an  @mention to the user
            info.push('Channel name:\t\t' + channel.name);
            info.push('Created at:\t\t' + channel.createdAt);
            info.push('Creation timestamp:\t\t' + channel.createdTimestamp);
            info.push('Channel ID:\t\t' + channel.id);
            info.push("Channel type:\t\t" + channel.type);

            channel.send( info.join('\n') );
        }

        //This block provides channel message purging functionality.
        //TODO: Won't purge if any messages are > 14 days old //Should be fixed now, test
        if (command === "purge" && ServerValues.vars.enablePurge && active) { //TODO: add authority check on calling user, and proper enable/disable functionality
            let deleteCount = parseInt(args[0], 10);  //get number of messages to be deleted, base 10 

            if (!deleteCount || deleteCount < 2 || deleteCount > 100) {
                return msg.reply("Please provide a number between 2 and 100 for the number of messages to delete");
            }

            let fetched = await msg.channel.fetchMessages({limit: deleteCount});
            //fetched = fetched.filter(msg => msg.deletable === true);    //removes messages older than 14 days from collection of messages to be purged

            msg.channel.bulkDelete(fetched, true)   //Second parameter tells function to filter out messages older than 14 days
                .then(deleted => msg.channel.send("Successfully purged " + deleted.size + " messages."))
                .catch(error => msg.reply("Couldn't delete messages because of " + error));
        }

        //!help command, prints content of readme.txt
        if (command === "help" || command === "readme") {
            commandHelp(msg);
        }
        
        //!invitelink command, helps invite bot to new servers
        if (command === "invitelink" && active) {
            commandInviteLink(msg);
        }

        //Checks if a specified user is streaming, if so sends alert to stream-notifications channel
        //Incomplete implementation
        if (command === "checkstream" && active) {
            if (args.length < 1) {
                msg.reply("I need the name of the Twitch streamer to check.");
            }
            else {
                msg.reply("Checking if " + args[0] + " is live. I'll post to the notification channel if they are.")
                //streamStatus(args[0]);
            }

        }
        //Reconnects the discord bot to the API server
        //TODO: Needs testing
        if (command === "refresh" && active) {
            client.destroy()
            //.then (() =>  client.login(config.token)) //Should not be needed with auto-reconnect functionality enabled.
            .then (() => msg.reply("Refreshing connection to Discord API!"))
            .catch(error => msg.reply("Could not refresh, error " + error));
        }

        //Change server variable by name. Experimental. Currently unlocked for bot owner in home server.
        if (command === "changevar" && active) {
            let processed: boolean  = false;

            if (msg.guild.owner.id === config.owner && msg.author.id === config.owner) { //Upgrades current server to level 3 authorization if the server is owned by the bot owner
                ServerValues.setAuthorizationLevel(3);

                if (args[0] === 'alertMessage') {   //for now, carving out an exception for stream alert message so user can enter spaces in command
                    processed = await ServerValues.changeVariable(args[0], args.slice(1, args.length).join(" "));
                    processed ? msg.reply(args[0] + " value changed successfully.") : msg.reply("Couldn't change value " + args[0] + ", check that it is spelled properly and has matching capitalization, and complies with any specific restrictions.");

                }
                else if (args.length !== 2) {    //if not enough arguments
                    msg.reply("Change variable command requires 2 arguments, first being the variable name and second being the new value.")
                }
                else if (ServerValues.vars[args[0]] == args[1]) { //if the variable change request already matches the config
                    msg.reply(args[0] + " is already set to the requested value on this server.");
                }
                else {
                    processed = await ServerValues.changeVariable(args[0], args[1]);
                    processed ? msg.reply(args[0] + " value changed successfully.") : msg.reply("Couldn't change value " + args[0] + ", check that it is spelled properly and has matching capitalization, and complies with any specific restrictions.");
                }
            }
        }

        //remotely shutdown the bot
        if (command == 'shutdownbot' && active && ServerValues.vars.authorization_level >= 3) {
            await msg.reply("Shutdown command received. Going offline.");   
            process.exit(0);    //TODO: Implement global flag that determines if file operations are running or done, preventing file corruption.
        }

        // //Regenerate config for the bot on the server
        // if (command === "regenerateConfig") {
        //     ServerValues.regenerateConfig(msg);
        //     msg.reply("Regenerated my config in bot-config text channel.");
        // }
    }
});


//Create an event listener for new guild members
client.on('guildmemberadd', member1 => {
    //Send the message to a designated channel on a server
    const channel = member1.guild.channels.find(ch => ch.name === 'member-log');

    //Send message if the channel exists
    if (channel) {
        channel.send('Welcome to the server, ${member1}');
    }
});

/**
 * Generates a string with a basic invite link for the bot. Although redundant it will remain for now as it completes in < 1 ms whereas
 * the Discord.js method runs asynchronously and takes 80ms to resolve.
 * TODO: Work out starting permissions
 */ 
function generateInviteLink() {
    return ('Invite link: https://discordapp.com/oauth2/authorize?client_id=' + config.clientID + '&scope=bot');
}



//This function generates an embedded message for stream announcements. TODO: allow user to switch between rich embed and basic message for stream notifications.
//Produced with help from https://leovoel.github.io/embed-visualizer/ and https://anidiots.guide/first-bot/using-embeds-in-messages
function streamEmbed(streamObject: MyTwitchModule.Stream, streamerObject: MyTwitchModule.User, gameObject: MyTwitchModule.Game): Discord.RichEmbed {
    const embed = new Discord.RichEmbed() //Convenient builder class for rich embeds, provided by discord.js
        .setTitle(streamObject.title)
        .setAuthor(client.user.username, client.user.avatarURL)
        .setColor(config.embedColor)
        .setThumbnail(streamerObject.profile_image_url)
        .setURL("https://www.twitch.tv/" + streamerObject.display_name)
        .setImage(streamObject.thumbnail_url.replace('{width}', '1920').replace('{height}', '1080'))
        .setTimestamp()
        .setFooter("Stream notifications by " + config.BOT_NAME_VERSION, client.user.avatarURL)
        .addField("Game", gameObject.name);
    return embed;
}


//Function that is called when the !help command is seen. Prepares a response that includes
//the readme.txt contents, read from file as a stream.
//In testing, found this function no longer worked properly when the readme.txt became longer than 2000 characters. For
//now, fixing this by splitting the readme file into sections and sending each one in a separate message.
//TODO: Handle file not found and related exceptions
//TODO: Handle sections that may be longer than the message limit by creating multiple messages
//Help from https://stackabuse.com/read-files-with-node-js/.
function commandHelp(messageObject, filePath = "./doc/readme.txt") {
    const readStream = fs.createReadStream(filePath); //initializes a file read stream of the readme file
    var data = "";
    var responseArray = []; //Stores messages to be sent in order on the server

    readStream.on('data', chunk => data += chunk)   
        .on('end', () => {
            responseArray = Util.splitByHeaders(data, "____");
            for (let i = 0; i < responseArray.length; i++) { //reformats each message such that it appears in a neat code block on Discord.
                responseArray[i] = responseArray[i].replace(/(____)/gm, '');  //removes the header formatting from the message TODO: Consider doing this within the splitByHeaders function?
                //responseArray[i] = "```diff\n+" + responseArray[i] + "```";     //Old way of wrapping in code block, restore if problems arise
                responseArray[i] = Util.codeblockWrap(responseArray[i], "diff");
            }  
            messageObject.channel.send("Hey " + messageObject.author + ", my helpfile is below!")
                .catch(error => messageObject.reply("Could not post help file due to error : " + error));
            while (responseArray.length !== 0) {
                messageObject.channel.send(responseArray.shift());
            }
        });
}

//Sends caller an invite link to the bot. For now only responds to bot owner.
function commandInviteLink(messageObject) { //Cannot type this as a Discord.Message because following conditional marked as error, not treating a User as a possible snowflake.
    if (messageObject.author === config.owner) {
        messageObject.reply(generateInviteLink())
            .catch(error => console.log("Couldn't send invite link, error " + error));
    }
    else {
        messageObject.reply("You aren't authorized to do that.");
    }
}

//Sets activity message for bot. Abstracted here so calling without parameter will set to a default.
function setActivity(activityString:string = undefined) {
    if (activityString === undefined) {
        client.user.setActivity(config.BOT_NAME_VERSION + " | " + config.prefix + "help for more info", { type: 'PLAYING' })
            .then(presence => console.log(`Activity set to ${presence.game ? presence.game.name : 'none'}`))
            .catch(console.error);
    }
}

//Sets rich presence for bot, calling function with no param will set it to the default. Having it abstracted to this
//function will help when adding music playback or other functionality later on. For now basic activity will be used instead.
function setRichPresence() {
    client.user.setPresence({ game: { name: config.prefix + "help" }, status: 'online' })
    .then(console.log)
    .catch(console.error);
}

//TODO: Put this in it's own file, or finally make a /commands/ folder
//TODO: Re-evaluate how ping is measured, client.ping may be a cached value 
//TODO: Find best way to clean up and align formatting
//TODO: Use template literals for better formatting and readability
function latencyTesting(msg: Discord.Message, args: string[]) {
    const s = "Running tests.... iteration ";
    let results: Array<[number, number]> = [];
    let resultsFormatted: Array<string> = [];
    let medianLatency: number;
    let medianLatencyArray: number[], medianPingArray: number[] ;
    let count: number = 1, limit: number, averageLatency: number = 0, averagePing: number = 0;
    let medianIndex1: number, medianIndex2: number;
    let previousTimestamp: number = null, currentTimestamp: number = null, currentPing: number = null;
    let failCount: number = 0;
    let operatingInTextChannel: boolean = false;
    let done: boolean = false, processing: boolean = false;
    let listener: any;   //Typing here is a mess
    let testMessage: Discord.Message = null ;
    let mainMessage: Discord.Message = null;
    let interval: number;
    let averageType: string;

    args[0] ? limit = parseInt(args[0], 10) : limit = 10;
    args[1] ? interval = parseInt(args[1], 10) : interval = 1;
    //Determine whether to use mean or median for average
    if (!args[2] && args[2] === 'mean') {   //if the second argumment exists and it is exactly "mean"
        averageType = 'mean';
    }
    else {  //For now, defaults to median unless mean is explicity specified
        averageType = 'median';
        medianPingArray = [];   //Need to initialize additional arrays if median is being measured
        medianLatencyArray = [];
    }

    //TODO: Have bot attempt to create a channel just for sending the benchmark messages so it doesn't cause a disturbance in the current one, then delete the channel. If channel cannot be made, use original behavior.
    //Channel names apparantly don't have to be unique, but ideally avoid existing names to prevent confusion for users. Can also create in its own category. Make channel invisible to most users.
    
    if (limit !== NaN && limit >= 2) {
        
        listener = async function() : Promise<boolean> {   //one-off function to be called on the interval
            
            if (count <= limit && !processing && !done) {   
                processing = true;  //Just for extra safety
                if (count === 1) {
                    resultsFormatted.push("\t\tBot Latency\t\tAPI Latency\t\tInterval " + interval + s + "\t\tAveraging: " + averageType.toUpperCase());
                    mainMessage = await msg.channel.send(('`' + s + count + '/' + limit + '`')) as Discord.Message
                    
                }
                await msg.channel.send('_')
                    .then(async (testMessage:Discord.Message) => {
                        previousTimestamp = testMessage.createdTimestamp;
                        await testMessage.delete();
                        await msg.channel.send("_")
                            .then(async (newMessage:Discord.Message) => {
                                currentTimestamp = newMessage.createdTimestamp;
                                await newMessage.delete();
                            })
                    });
                currentPing = Math.round(client.pings[0]);
                results.push([currentTimestamp - previousTimestamp, currentPing]);
                resultsFormatted.push("Run " + count + ":\t\t" + (currentTimestamp - previousTimestamp) + "ms\t\t\t" + currentPing + "ms");
                //previousTimestamp = currentTimestamp;
                processing = false;
                await mainMessage.edit('`' + s + count + '/' + limit + '`');
                count++;
            }
            else if (processing !== true && !done) {    //begin averaging the data
                //steps to take if the average is a mean
                if (averageType === 'mean') {   
                    results.forEach((element) => {  //sum up all the results into one value
                        averageLatency += element[0];
                        averagePing += element[1];
                    });
                    //Divide total by number of tests to get mean, based on actual size of data set and not user requested
                    averageLatency /= results.length;
                }

                //steps to take if the average is a media, default case
                else if (averageType === 'median') {    
                    results.forEach(element => {    //splits the result array into 2 arrays, one for latency and one for ping
                        medianLatencyArray.push(element[0]);
                        medianPingArray.push(element[1]);
                    });
                    //Sorts the arrays into ascending order 
                    medianLatencyArray.sort((n1: number, n2: number) => {return n1 - n2});
                    medianPingArray.sort((n1: number, n2: number) => {return n1 - n2});
                    if (results.length%2 === 0) {    //if # of test cases is even size, need to take average of middle 2 values for median
                        medianIndex1 = Math.floor(results.length/2) - 1;    //convert floating point value into integer and account for indexing
                        medianIndex2 = medianIndex1 + 1;

                        //calculate medians of latency and pings
                        averageLatency = (medianLatencyArray[medianIndex1] + medianLatencyArray[medianIndex2]) / 2;
                        averagePing = (medianPingArray[medianIndex1] + medianPingArray[medianIndex2]) / 2;
                    }
                }
                
                resultsFormatted.push("Averages:\t" + averageLatency.toFixed(3) + "ms\t\t\t" + averagePing.toFixed(3) + 'ms');
                await mainMessage.delete();
                //msg.reply('Test results are as follows' + '(' + results.length + ' runs made out of ' + limit + 'runs requested):\n' + Util.codeblockWrap(resultsFormatted.join('\n'), 'xl'));
                msg.reply(`Test results are as follows (${results.length} runs made out of ${limit} runs requested):\n${Util.codeblockWrap(resultsFormatted.join('\n'), 'xl')}`); //Practice with template literals
                done = true;
            }
            return !done;
        }

        Util.myLogger("attempting to bind function now")
        DiscordTimestamper.bindFunction(interval, listener); //TODO: this may cause problems if multiple servers call this function 
        //SOLVED: It works because the binding class is not properly removing functions/keys that are finished from the collection, nor does it check for duplicates before adding. This is not a proper workaround and will lead to performance loss down the road.
        //TODO: use function name and server ID to identify running tests, each server can have max 1 instance running at a time, may need to rework timestamper function to take label
    }    
}

//Manages the bot's connection to the Discord API. Meant to run in the background. TODO: Testing, move to new class
function connectionManager(param: string) { 
    if (param === "login") {
        client.login(config.token)  //login into the bot
            .then(() => console.log("Established connection to Discord API."))
            .catch(error => console.log("Failed to connect to Discord API, error: " + error));
    }
    if (param === "refresh") {
        if (client.status === 0) {    //If the client has no connection to discord API
            client.login(config.token)  //login into the bot
            .then(() => console.log("Established connection to Discord API."))
            .catch(error => console.log("Failed to connect to Discord API, error: " + error));
        }
    }
    return false;   //Since it's passed to setInterval() as a callback it needs to return a bool, false so it never stops, risky TODO: consider wrapping in bool function
}

/**
 * Gets the server specific variables, returns a boolean if they could not be loaded.
 * @param {Discord.guild} server 
 * @returns False if values could not be loaded, true if they were
 */
async function loadServerValues(server: Discord.Guild): Promise<boolean> {
    ServerValues = new SimpleServerVarsManager(server); 
    await ServerValues.setup(); //wait until the server values object is fully setup
    return ServerValues.valid;
}

//export = client; //Old export, only exports discord, revert if problems arise
export { client as DiscordClient, twitch2 as TwitchClient2};    //So that other modules can use the logged in client for both twitch and discord TODO: Client login in its own module