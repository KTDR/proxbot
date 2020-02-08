//For testing individual functions

import config = require("./config/config-beta.json"); //imports server and user specific variables from external file  //import added so the typescript compiler adds it to /build/config
import adminConfig = require('./config/config-admin.json'); //admin settings
import Discord = require("discord.js");  //imports Discord client class TYPESCRIPT SPECIFIC https://www.typescriptlang.org/docs/handbook/modules.html
//import * as Discord from 'discord.js'; //alternate way to import Discord API?
import MyHRTimer from './MyHRTimer';
import SimpleServerVarsManager = require("./SimpleServerVarsManager");  //TODO: Move server values to separate module so it can be accessed more readily
import MyTwitchModule = require('./MyTwitchModule');

import Util = require('./MyDiscordUtils') ; //importing frequently used functions into global namespace for now
import MyTimestamper = require('./MyTimestamper');
import StreamChecker = require('./Streamchecker');


// MyHRTimer.startTime('test');
// setTimeout(() => console.log(MyHRTimer.endTimeMs('test').toFixed(2)), 2000);

let timestamp = new MyTimestamper().start();
setInterval(() => console.log(timestamp.getTimestamp()), 1000);