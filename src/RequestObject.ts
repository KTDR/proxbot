import Discord = require('discord.js');
import { throws } from 'assert';

/**
 * Base clss for bug reports, feature and authorization requests. May need to be split into proper subclasses later on
 */
class RequestObject {

    type: RequestType;
    authorID: Discord.Snowflake; //Discord ID of the authoring user
    serverID: Discord.Snowflake; //Discord ID of the server the request is made on behalf of
    status: RequestStatus;
    content: string;

    /**
     * Creates a request object of the specified type. Author, status, and content must be set manually and 
     * are initialized to null values. Constructor can be chained as all setters return the object.
     * @param type request type to be used, if not specified defaults to null.
     */
    constructor(type: RequestType = null) {
        this.type = type;
        this.authorID = null;
        this.serverID = null;
        this.status = null;
        this.content = null;
    }

    setType(type: RequestType) : RequestObject {
        this.type = type;
        return this;
    }

    setAuthorID(author: Discord.Snowflake): RequestObject {
        this.authorID = author;
        return this;
    }

    setServerID(serverID: Discord.Snowflake): RequestObject {
        this.serverID = serverID;
        return this;
    }

    setStatus(status: RequestStatus): RequestObject {
        this.status = status;
        return this;
    }

    setContent(content: string): RequestObject {
        this.content = content;
        return this;
    }

    isComplete(): boolean {
        return ( this.type !== null && this.authorID !== null && this.serverID !== null && this.status !== null && this.content !== null);
    }
}

/**
 * Object that holds information about a ban from using the report/request features of this bot. Can hold 
 * both user and server information, but only one is required for the ban object to be considered complete.
 */
class BanObject {
    
    userID: Discord.Snowflake;    //ID of banned user
    serverID: Discord.Snowflake;  //ID of server banned from making a request/report
    issuedAt: number;  //timestamp of when the ban was issued, according to Discord epoch
    duration: number;  //duration of ban, in seconds
    reason: string; //explanation why the ban was issued

    constructor(userID: Discord.Snowflake = null) {
        this.userID = userID;
        this.serverID = null;
        this.issuedAt = null;
        this.duration = null;
        this.reason = null;
    }

    setUserID(userID: Discord.Snowflake): BanObject {
        this.userID = userID;
        return this;
    }

    setServerID(serverID: Discord.Snowflake): BanObject {
        this.serverID = serverID;
        return this;
    }
    
    setIssuedAt(timestamp: number): BanObject {
        this.issuedAt = timestamp;
        return this;
    }

    setDuration(duration: number): BanObject {
        this.duration = duration;
        return this;
    }
    
    setReason(reason: string): BanObject {
        this.reason = reason;
        return this;
    }

    isComplete(): boolean {
        return ( (this.serverID !== null || this.userID !== null) && this.issuedAt !== null && this.duration !== null && this.reason !== null )
    }
    

}

enum RequestType {
    FEATURE_REQUEST = 'FEATURE_REQUEST',
    BUG_REPORT = 'BUG_REPORT',
    AUTH_REQUEST = 'AUTH_REQUEST',
}

enum RequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    DENIED = 'DENIED',
    ACKNOWLEDGED = 'ACKNOWLEDGED',
}

//TODO: Add a blacklist file for abusive users
