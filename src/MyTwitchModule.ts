//Current twitch module uses a deprecated API so accessing some endpoints on the new API with my own functions instead
import config = require("./config/config-beta.json");
import https = require('https');
import Util = require('./MyDiscordUtils');
import { stringify } from "querystring";

//import Util = require('./MyDiscordUtils');

const apiPrefix: string = 'https://api.twitch.tv/helix/';

export class Client {
    private twitchID: string;
    private twitchSecret: string;
    private twitchHeaders: Object;
    private requestOptions: Object;
    private bearerToken: string;
    private tempBearerToken: string;
    private twitchHeadersBearer: Object;

    constructor() {
        this.twitchID = config.twitchID;
        this.twitchSecret = config.twitchSecret;
        this.twitchHeaders = {'Client-ID' : config.twitchID};
        this.requestOptions = {'headers' : this.twitchHeaders};
        this.bearerToken = null;
        this.tempBearerToken = config.twitchBearerToken;    //TODO: Bearer tokens only last about 60 days, implement function to automatically get new tokens
        this.twitchHeadersBearer = {"Authorization: Bearer" : config.twitchBearerToken};    //TODO: if a bearer token auth fails have module fallback to client-ID until it can get a new bearer token
    }

    private async makeTwitchRequest(parameters: string, header = this.twitchHeadersBearer): Promise<TwitchObject> {
        return new Promise((resolve, reject) => {   //wrapped in a promise as it's easier to use for me
            let obj: TwitchObject = null;
            let url = apiPrefix + parameters;
            let options = {headers: {'Authorization': "Bearer " + this.tempBearerToken}};

            https.get(url, options, (resp) => {
                let data = '';
                resp.on('data', (chunk) => {
                    data += chunk;
                });
                resp.on('end', () => {
                    if (!data.length) {
                        obj = null;
                    }
                    else {
                        obj = JSON.parse(data);
                    }
                    resolve(obj);
                });
            }) 
        })
    }

    /**
     * NOT YET IMPLEMENTED
     */
    private async getBearerToken() {    //TODO: finish and implement
        return new Promise((resolve, reject) => {
            let url = "https://id.twitch.tv/oauth2/token"
                + "?client_id=" + this.twitchID
                + "&client_secret=" + this.twitchSecret
                + "&grant_type=client_credentials";
            let options = {method: 'POST', headers: {'Client-ID': this.twitchID}};

            https.get(url, options, (resp) => {
                let data = '';
                resp.on('data', chunk => data += chunk);
                resp.on('end', () => Util.myLogger(data));
            });
        });
    }

    /**
     * Returns a properly capitalized string of the Twitch user. If the Twitch user does not exist, returns null.
     * @param name Twitch username to be retrieved
     */
    async getTwitchUsername(name: string): Promise<string> {
        let userInfo: User;
        let username: string = null;

        await this.makeTwitchRequest("users?login=" + name.trim())
            .then(r => {
                if (r) {
                    userInfo = r.data[0];
                }
            });

        if (userInfo) {
            console.log(userInfo.display_name);
            username = userInfo.display_name;
        }
        return username;
    }

    /**
     * Returns a stream object for the twitch user. If the stream does not exist, returns null.
     * @param name Twitch username of stream to be retrieved
     */
    async getStream(name: string): Promise<Stream> {
        let streamInfo: Stream = null;
        let username: string = null;

        await this.makeTwitchRequest("streams?user_login=" + name.trim())
            .then(r => {
                if (r.data.length) {
                    //console.log("r : " + JSON.stringify(r));
                    streamInfo = r.data[0];
                }
            });


        //Util.myLogger(JSON.stringify(streamInfo));
        console.log("streamInfo" + streamInfo)
        return streamInfo;
    }

    /**
     * Returns a user object for the twitch user. If the user does not exist, returns null.
     * @param name Twitch username of stream to be retrieved
     */
    async getUserObject(name: string): Promise<User> {
        let userInfo: User = null;
        let final: User = null;

        await this.makeTwitchRequest("users?login=" + name.trim())
            .then(r => {
                if (r.data.length) {
                    userInfo = r.data[0];
                }
            });

        if (userInfo) {
            console.log(userInfo);
            final = userInfo;
        }

        Util.myLogger(JSON.stringify(final));
        return final;
    }

    /**
     * Returns a game object for the twitch game ID. 
     * @param gameID Twitch username of stream to be retrieved
     */
    async getGameObject(gameID: string): Promise<Game> {
        let gameInfo: Game;
        let final: Game = null;

        await this.makeTwitchRequest("games/?id=" + gameID.trim())
            .then(r => {
                if (r.data.length) {
                    gameInfo = r.data[0];
                }
            });

        if (gameInfo) {
            console.log(gameInfo);
            final = gameInfo;
        }

        Util.myLogger(JSON.stringify(final));
        return final;
    }

    static async runUsernameTest() {
        let myMod = new Client();
        let name = null;
        await myMod.getTwitchUsername("Shroud")
            .then(s => {
                if (s) {
                    name = s;
                }
            });
        console.log("Shroud: " + name);
    }
}

export class User {
    id: string;
    login: string;
    display_name: string;
    type: string;
    broadcaster_type: string;
    description: string;
    profile_image_url: string;
    offline_image_url: string;
    view_count: number;
}

export class TwitchObject {
    data: any[]
}

export class Stream {
    id: string;
    user_id: string;
    user_name: string;
    game_id: string;
    community_ids: any[];
    type: string;
    title: string;
    viewer_count: number;
    started_at: Date;
    language: string;
    thumbnail_url: string;
    tag_ids: string[];
}

export class Game {
    id: string;
    name: string;
    box_art_url: string;
}

