//Object based on process.hrtime() to help measure execution time in high resolution
const NANOSECONDS_IN_SECOND: number = 1e9;
const NANOSECONDS_IN_MILLISECOND: number = 1e6


/**
 * Class to help with performance and response time evaluation. For now, the Class 
 * instance is used to keep track of timer objects created and does most of the work.
 * @class MyHRTimer
 */
export default class MyHRTimer {
    private label: string;  //name of the timer, serves as identifier
    private start: [number, number]; //tuple holds the seconds and nanoseconds of when this class was created
    private static collection: Map<string, MyHRTimer> = new Map(); //Class property to hold all timer objects 

    /**
     * Create a new timer object, identified by a string label. Labels are case 
     * sensitive and no two objects should have the same label.
     * @param s Label for new timer
     */
    constructor(s: string) {    //TODO: Ensure label isn't already in the map
        this.label = s;
        this.start = process.hrtime();  //High precision timestamp of when the this timer was created. Provided as a tuple [seconds, nanoseconds]
        MyHRTimer.collection.set(this.label, this); //Keys are according to label
    }

    /**
     * Creates a new timer with specified label
     * @static
     * @param {string} label
     * @memberof MyHRTimer
     */
    public static startTime(label: string) {
        MyHRTimer.collection.set(label, new MyHRTimer(label));
    }
    
    /**
     * Ends a timer and returns the time in milliseconds since it was created. Returns null if no timer was found.
     * @param label label of the timer to end
     * @returns number in milliseconds, of time elapsed since timer was created
     */
    public static endTimeMs(label: string): number {
        let endTimestamp: [number, number] = process.hrtime();   //Taking the ending timestamp early, to account for time needed to locate specified timer within the collection
        let timer: MyHRTimer = MyHRTimer.collection.get(label); 
        let startNano: number = null, endNano: number = null, diffNano: number = null;
        let returnValue: number = null; 
        
        console.log("Ending HR timer: " + timer);

        if (timer) {    //Prevent a null value error TODO: May need to improve this validation
            startNano = (timer.start[0] * NANOSECONDS_IN_SECOND) + timer.start[1];  //Calculate nanosecond starting timestamp
            endNano = (endTimestamp[0] * NANOSECONDS_IN_SECOND) + endTimestamp[1];  //Calculate nanosecond ending timestamp
            diffNano = endNano - startNano; //Calculate time elapsed in nanoseconds
            returnValue = diffNano / NANOSECONDS_IN_MILLISECOND;    //Calculate time elapsed in milliseconds
            timer = null; //Delete timer object
            MyHRTimer.collection.delete(label); //Remove timer object from map
        }
    
        return returnValue;
    }

    
    private static removeFromCollection(label: string): boolean {
        return MyHRTimer.collection.delete(label);
    }


    /**
     *
     * Returns a collection of all the active HRT Timers 
     * @static
     * @returns {Map<string, MyHRTimer>}
     * @memberof MyHRTimer
     */
    static getCollection(): Map<string, MyHRTimer> {
        return MyHRTimer.collection;
    }

    /**
     * Gets the internal timestamp in seconds of when this object was created
     * @returns {number}
     * @memberof MyHRTimer
     */
    public getStartSeconds(): number {
        return this.start[0];
    }
}