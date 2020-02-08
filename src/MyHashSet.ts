import Util = require('./MyDiscordUtils') ; //importing frequently used functions 

//Basic set structure for my program, the index is based on a hash of the contents of the entry
//import hash from 'string-hash'; //Efficient algorithm for hashing string to a number, low collision 

/**
 * Mostly using the built-in javascript Map() instead. Using this only in a couple of places.
 */
export default class MyHashSet<T extends Object> {
    private collection: Map<number, T>;
    private hasher: Function; //function to be used to generate the hash


    constructor(hashFunc: Function = MyHashSet.stringHasher) {
        this.collection = new Map<number,T>();
        this.hasher = hashFunc;
    }


    /**
     * Adds a single value to this set
     *
     * @param {T} value
     * @returns {MyHashSet<T>}
     * @memberof MyHashSet
     */
    public add(value: T): MyHashSet<T> {
        let key: number = this.hasher(value);

        if (!this.collection.has(key)) {    //If the set doesn't already contain an equivalent value
            this.collection.set(key, value);
        }
        return this;
    }

    /**
     * Adds all members of any iterable list to this set
     * Do not pass non-list objects to this method.
     *
     * @param {Iterable<T>} values Values to be added
     * @returns {MyHashSet<T>}
     * @memberof MyHashSet
     */
    public addAll(values: Iterable<T> ): MyHashSet<T> {
        for (let element of values) {
            this.add(element);
        }
        return this;
    }

    /**
     * Removes specified value from the set
     *
     * @param {T} value
     * @returns {boolean} returns true if the value was found and removed
     * @memberof MyHashSet
     */
    public remove(value: T): boolean {
        let removed: boolean = false;
        let key: number = this.hasher(value);

        if (this.collection.has(key)) {
            this.collection.delete(key);
            removed = true;
        }
        return removed;
    }

    /**
     * Removes all members of any iterable list to this set
     * Do not pass non-list objects to this method.
     *
     * @param {Iterable<T>} values Values to be removed
     * @returns {MyHashSet<T>}
     * @memberof MyHashSet
     */
    public removeAll(values: Iterable<T>): MyHashSet<T> {
        for (let element of values) {
            this.remove(element);
        }
        return this;
    }

    /**
     * Returns a new hash set containing elements that are in this one but not in the one passed to this function
     * This will only work properly if both sets are using the same hashing function
     *
     * @param {MyHashSet<T>} secondSet Set of elements to subtract from this one
     * @returns {MyHashSet<T>}
     * @memberof MyHashSet
     */
    public subtract(secondSet: MyHashSet<T>): MyHashSet<T> {
        let newSet = new MyHashSet<T>(this.hasher); //Creates a new hash set with currently used hashing function

        if (this.hasher !== secondSet.hasher) {
            //TODO: Throw an exception here
            return null;
        }

        for (let element of this.collection) {
            //Addressing the map objects contained within directly to avoid extra unecessary hashing //TODO: Find a better way
            if (!secondSet.collection.has(element[0])) {  //Adds back the value only if it's not in the second set
            newSet.collection.set(element[0], element[1]); 
            }
        }

        return newSet;
    }

    /**
     * Determines if specified value is in this set or not.
     *
     * @param {T} value
     * @returns {boolean}
     * @memberof MyHashSet
     */
    public contains(value: T): boolean {
        let key: number = this.hasher(value);
        return this.collection.has(key);
    }

    /**
     * Return the number of elements in this set
     *
     * @returns {number}
     * @memberof MyHashSet
     */
    public size(): number {
        return this.collection.size;
    }

    /**
     * Returns an array of the values in this set.
     *
     * @returns {Array<T>}
     * @memberof MyHashSet
     */
    public toArray(): Array<T> {
        let returnArray = [];
        for (let value of this.collection.values()) {
            returnArray.push(value);
        }
        return returnArray;
    }

    /**
     * Produces a hash for an object using it's toString() method. 
     * Based on solution found here: https://stackoverflow.com/questions/6122571/simple-non-secure-hash-function-for-javascript
     *
     * @static
     * @param {Object} o Object to generate a hash from
     * @returns Hash as a number
     * @memberof MyHashSet
     */
    public static stringHasher(o: Object): number {
        let hash: number = 0;
        let oString: string = o.toString();

        if (oString.length === 0) {
            return hash;
        }
        for (let i = 0; i < oString.length; i++) {
            let char = oString.charCodeAt(i);
            hash = ((hash<<5)-hash)+char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }
}

