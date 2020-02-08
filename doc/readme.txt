____ABOUT:____

Discord bot for low delay Twitch stream notifications and light server housekeeping. Build on Node.js and Typescript. Built as a personal project to help me learn 
a new language and Node.js/Asynchronous programming.

This bot requires a config file on the discord server for most of the functions to work. Create a channel named bot-config and the bot will automatically generate a new one the next
time it receies a command.
This bot is not feature complete and is still under development. Bug reporting and feature requests will be added later on.


____COMMAND_LIST:____
For now, the bot only responds to commands coming from the owner's discord account, or users with the role "Bot Admin" (no quotes, capitalization doesn't matter).
Be careful with who you give the bot admin role to, they have complete control over the bot. I will add more comprehensive administrative features down the road.
Commands arguments follow the command name and are generally space-separated when specifying more than one parameter. Parameters are inferred in order and parameters starting with ? are optional.

!help
Posts the contents of this file to the channel where it is called as a reply to the calling user.

!ping
Checks the Discord API latency and is helpful for testing.

!avatar [user]
Returns a link to the avatar of the caller, or a specified user if their ID is added as an argument. 
This feature is untested.

!purge
Clear messages in the channel it is called in, between 2 and 100 specified in the argument. This will not purge messages that
are over 14 days old due to Discord API restrictions. If any messages in the purge set are 14+ days old, the command will fail. This is being worked on.
To enable message purging, create a channel named enable-purge that is visible to the bot. To disable purging, delete this channel.

!echo [channel] [message]
Have the bot send a message in another channel. After the command, enter a #channel mention and then write your message.

!channelinfo
Prints info about the channel this is called in.

!invitelink
Posts an invite link to the bot. Access is limited for now.

!refresh
Restarts the connection to the Discord API. This does not restart the bot itself and may not fix all issues.

!checkstream [username]
Checks the status of the requested streamer and if live sends the alert to the stream-notifications channel

!runlatencytest [?interval] [?runs]
Runs several latency tests and outputs the results.

____COMMAND_LIST_CONT.:____


____OTHER_FEATURES:____

-Stream notifications: 
The bot passively checks twitch streams on the last server where a message was sent. (This will be improved later).
The list of streamers monitored is hardcoded in for now.
To enable stream notifications, create a channel named stream-notifications that is visible to the bot and configure your twitch name in the supplied json.
To disable, delete the channel.

-Server join notifications:
To enable member join notifications, create a channel named member-log that is visible to the bot. Bot will announce new members here. 
To disable member join notifications, delete this channel. 

-Uptime and availability:
For now, the bot is hosted on a Raspberry Pi Zero W with the PM2 process manager, so it should return shortly after a crash or a server reboot. However it may not
recover from extended network outages, this is being worked on.

This readme may not be up to date. For the latest changes, review the changelogs.

____CREDITS:____
The Discord.js team for their excellent API interface and online documentation.
https://github.com/Stateford/twitch-api, although now replaced with my own solution, helped me get started and understand how the Twitch API works