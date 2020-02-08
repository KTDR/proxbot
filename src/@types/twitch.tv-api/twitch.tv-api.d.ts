/** Hand-written type declaration file for twitch.tv-api*/
//JSDOC comments added solely for the intellisense tooltips, I don't know how else to go about it

declare module "twitch.tv-api" {
        //import request from './bin/request.js';
        import url from 'url';
        import qs from 'querystring';
        import Promise from 'bluebird';

    class Twitch {
       
        private id: string;
        private secret: string;

        constructor(options:any);

        /**
         * @method makeRequest
         * @description : makes a request to protocol http or https server with correct API headers
         * @param {String} http : passes an string to our request
         * @returns {Promise.<string, Error>} returns data from an http request;
        */
        makeRequest(http: string): Promise<string>;

        /**
         * @method getUserId
         * @description : gets user id from username
         * @param {String} username
         * @returns {Promise.<string, Error>}
         */
        getUserId(username: string): Promise<string>;

        /**
         * @method getUser
         * @description : gets user data from the api
         * @param {String} username : the username we want information from
         * @returns {Promise.<string, Error>} : resolves JSON data or rejects an error
        */
        getUser(username: string): Promise<string>;

        /**
         * @method getFeaturedStreams
         * @description : Gets featured streams
         * @param {Object} options : optional query params
         * @param {Integer} options.limit : maximum number of objects in array {Default: 25} {Maximum: 100}
         * @param {Integer} options.offset : object offset for pagination {Default: 0}
         * @returns {Promise.<string, Error>} : resolve JSON data or rejects an error
        */
        getFeaturedStreams(options: any): Promise<string>;

        /**
         * @method getTopStreams
         * @description : Makes an api call to retrieve all top streams on twitch
         * @param {Object} options : optional query params
         * @param {String} options.channel : streams from a comma separated list of channels
         * @param {String} options.game : streams categorized under {game}
         * @param {String} options.language : only shows streams of a certain language. Permitted values are locale ID strings, e.g. {en}, {fi}, {es-mx}
         * @param {String} options.stream_type : only shows streams from a certain type. Permitted values: {all}, {playlist}, {live}
         * @param {Integer} options.limit : maximum number of objects in array {Default: 25} {Maximum: 100}
         * @param {Integer} options.offset : object offset for pagination {Default: 0}
         * @returns {Promise.<string, Error>} : resolves JSON data or rejects an error
        */
        getTopStreams(options: any): Promise<string>;

        /**
         * @method getTopGames
         * @description : Makes an API call to top games on twitch
         * @param {Object} options : optional query params
         * @param {Integer} options.limit : maximum number of objects in array {Default: 25} {Maximum: 100}
         * @param {Integer} options.offset : object offset for pagination {Default: 0}
         * @returns {Promise.<string, Error>} : resolves JSON data or rejects an error
        */
        getTopGames(options: any): Promise<string>;

        /**
         * @method getUsersByGame
         * @description : searches users by game
         * @param {String} game : the game we want to search
         * @returns {Promise.<string, Error>} : resolves JSON data or rejects an error
        */
        getUsersByGame(game: string): Promise<string>;

        /**
         * @method getStreamUrl
         * @description : finds rtmp streams
         * @param {String} user : the user we want to search
         * @returns {Promise.<string, Error>} : resolves link
        */
        getStreamUrl(user: string): Promise<string>;

        /**
         * @method searchChannels
         * @description : search for channels based on specified query parameter
         * @param {String} query : a channel is returned if the query parameter is matched entirely or partially, in the channel description or game name
         * @param {Integer} limit : maximum number of objects to return, sorted by number of followers {Default: 25} {Maximum: 100}
         * @param {Integer} offset : object offset for pagination of results {Default: 0}
         * @returns {Promise.<string, Error>} : resolves JSON data or rejects an error
        */
        searchChannels(query: string, limit: number, offset: number): Promise<string>;

        /**
         * @method searchStreams
         * @description : search for streams based on specified query parameter
         * @param {String} query : a stream is returned if the query parameter is matched entirely or partially, in the channel description or game name
         * @param {Integer} limit : maximum number of objects to return, sorted by number of followers {Default: 25} {Maximum: 100}
         * @param {Integer} offset : object offset for pagination of results {Default: 0}
         * @returns {Promise.<string, Error>} : resolves JSON data or rejects an error
        */
        searchStreams(query: string, limit: number, offset: number) : Promise<string>;

        /**
         * @method searchGames
         * @description : search for games based on specified query parameter
         * @param {String} query : a url-encoded search query
         * @param {Boolean} live : if true, only returns games that are live on at least one channel  {Default: false}
         * @returns {Promise.<string, Error>} : resolves JSON data or rejects an error
        */
        searchGames(query: string, live: boolean): Promise<string>;
    }
    export = Twitch;
    
}


