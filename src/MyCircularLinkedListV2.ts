
/*NOTABLE CHANGES: 
-Added a Map object to map all nodes existing on this object, making it easier to find their locations. May improve performance.
-Different requirements for objects to be comparable
-MyNode setters now return the node object instead of void, making it easier to add to the nodeMap and allows chaining
*/
//import Util from './MyDiscordUtils';

/**
 * A very basic circular linked list structure meant primarily for my stream checker utility. Can be used as a set through constructor options.
 * Single linked for now, will be upgraded to double linked if I have the time.
 * TODO: Rework so that it does not always have 2 nodes minimum after initialization
 * TODO: When comparing objects do so by hashcodes?
 * TODO: Add comparator method to streamer objects, compare by username
 */

class MyCircularLinkedList<T> implements Iterable<T> {

    private head: MyNode<T>;    
    private tail: MyNode<T>;
    private size: number;
    private comparator: Function;
    private useSet: boolean;    //enables use of this list as a set
    private nodeMap: Map<string, MyNode<T>>;   //hash table of node pointers, keep track of all nodes existing in this object TODO: Assess performance/memory impact

    constructor(options: string = "") {
        this.head = new MyNode<T>();
        this.tail = new MyNode<T>();
        this.size = 0;
        this.useSet = options.includes("-useSet");
        console.log( "using set" + this.useSet);
        this.comparator = function(o1: MyNode<T>, o2: MyNode<T>) { return (o1.ID() === o2.ID()) };  //Different comparator based on ID() of nodes, revert if problems arise
        
        this.tail.setNextNode(this.head);
        this.head.setNextNode(this.tail);
        this.nodeMap = new Map();   //create the node map
    }

    public addToEnd(value: T | T[]): MyCircularLinkedList<T> {
        let newNode: MyNode<T>;

        if (value instanceof Array) {   //recursion may have negative performance impact
            for (let entry of value) {
                if (this.useSet) {
                    if (!this.contains(entry)) {
                        this.addToEnd(entry);
                    }
                }
                else {
                    this.addToEnd(entry);
                }
            }
        }
        else {
            if (this.size === 0) {
                this.head.setValue(value);
                //this.nodeMap.set(this.head.getValue().toString(), this.head);
                this.nodeMap.set(this.head.ID(), this.head);
                this.size++;
            }

            else if (this.size === 1) {
                this.tail.setValue(value);
                //this.nodeMap.set(this.head.getValue().toString(), this.head)
                this.nodeMap.set(this.head.ID(), this.head)
                this.size++;
            }

            else if (this.size >= 2) {
                newNode = new MyNode<T>(value);
                newNode.setNextNode(this.head);
                this.tail.setNextNode(newNode);
                this.tail = newNode;
                this.nodeMap.set(newNode.ID(), newNode); 
                this.size++;
            }
        }
        return this;
    }
    
    public runIteratorTest(): void {
        let tester = new MyCircularLinkedList<number>();
        let iter = tester[Symbol.iterator]();
        let counter = 4;
        
        tester.addToEnd( [1,2,3] );
        
        setInterval( () => {
            console.log(iter.next().value);
        }, 1000);

        setInterval( () => {
            tester.addToEnd(counter++);
            console.log(tester.toArray());
        }, 5350)

    }

    public runDuplicateTest(): void {
        let tester = new MyCircularLinkedList<number>("-useSet");   //-useSet is not fully implemented...

        tester.addToEnd([1,1,1,2,2,3,4,5,5,5,6,7,8,8,8,8,8]);
        console.log("Size should be 17, " + tester.size);
        console.log(tester.toArray());
        tester.removeDuplicates();
        console.log(tester.toArray());
        tester.remove(6);
        console.log(tester.toArray());
    }

    /**
     * NOT YET IMPLEMENTED
     */
    public removeRandom() {
        let objectList: Array<T> = new Array<T>();

        for (let n of this.enumerateNodes()) {
        }
        return null;    //TODO: Not yet implemented
    }

    /**
     * Flags this list to be treated as a set then removes existing duplicates.
     * @param choice true to use as a set, false to stop using as a set
     */
    public configureSet(choice: boolean): MyCircularLinkedList<T> {
        if (this.useSet === false && choice === true) {
            this.removeDuplicates();
        }
       this.useSet = choice;
       
       return this;
    }

    /**
     * Sets the comparator for the objects contained within this list. If no argument is passed the default comparator is restored.
     * @param comparator Comparator function to be used, if no argument is passed default comparator is reset.
     */
    public setComparator(comparator?: Function) {
        comparator ? this.comparator = comparator : this.comparator = function(o1: MyNode<T>, o2: MyNode<T>) { return (o1.ID() === o2.ID()) };
        //TODO: Needs testing
    }
    
    /**
     * Remove any duplicates from this list 
     * @param comparator Optionally set a comparator used to check for duplicates, defaults to comparator already assigned in the function
     */
    public removeDuplicates(comparator = this.comparator) {  //Sadly looks like javascript doesn't have anything similar to the comparable interface in java
        let tempArray = new Array<MyNode<T>>(); //Array of nodes to help check for duplicates
        let indexNode: MyNode<T> = this.head;
        let previousNode: MyNode<T> = this.tail;
        let delCount = 0, runCount = 0;   //For testing
        let start = true;   //So the main loop will run the first time
    
        console.log("Starting at " + indexNode.getValue())
        while (!(indexNode === this.head && start === false)) {
            start = false;
            if (tempArray.some(element => comparator(indexNode, element))) { //if there is a match
                let head = false, tail = false;
                if (indexNode === this.head) {
                    //console.log("head");
                    head = true;
                }
                else if (indexNode == this.tail) {
                    //console.log("tail");
                    tail = true;
                }

                //Removes node and advances index
                previousNode = this.removeNode(indexNode, previousNode);
                indexNode = previousNode.getNextNode();

                if (head) {
                    this.head = indexNode;
                }
                if (tail) {
                    this.tail = previousNode;
                }
        
                console.log("deleted " + ++delCount + " nodes " );
            }
            else { //if there is no match
                tempArray.push(indexNode);
                previousNode = indexNode;
                indexNode = indexNode.getNextNode();
            }
            console.log("Runcount " + ++runCount);
            console.log(this.head.getValue() + "    " + this.tail.getValue())

        }
    }

    /**
     * NOT YET IMPLEMENTED
     */
    public addTofront(value: T): MyCircularLinkedList<T> {
        //TODO: Not yet implemented
        return null;
    }

    /**
     * Remove an object from this list by value. Uses the nodemap
     * @param value 
     * @param comparator 
     */
    public remove(value: T, comparator = this.comparator): boolean {
        let tempID = new MyNode<T>().setValue(value).ID();
        let targetNode: MyNode<T> = null;
        let deleted = false;

        if (this.nodeMap.has(tempID)) {
            targetNode = this.nodeMap.get(tempID);
            this.removeNode(targetNode);
            deleted = true;
            this.size--;
        }
        return deleted;
    }

    public getSize(): number {
        return this.size;
    }
    
    /**
     * Returns true if there is an instance of the object in the list
     * @param value Value to check for
     */
    public contains(value: T): boolean {
        return this.nodeMap.has(new MyNode<T>().setValue(value).ID());  //TODO: Get ID for T without creating a new node
    }

    /**
     * Fetches and returns the matching object
     */
    public fetch(value: T): T {
        let target: T = null;
        let tempNode = new MyNode<T>().setValue(value);

        if (this.nodeMap.has(tempNode.ID())) {
            target = this.nodeMap.get(tempNode.ID()).getValue();
        }
        return target;
    }

    private getPreviousNode(targetNode: MyNode<T>): MyNode<T> {
        let prevNode: MyNode<T> = null;
        for (const [key, value] of this.nodeMap.entries()) {
            if (value.getNextNode().ID() === targetNode.ID()) {
                return value;
            }
        }
        return prevNode;
    }

    /**
     * Returns a node object for the given value. Uses the NodeMap
     *
     * @private
     * @param {T} value
     * @returns {MyNode<T>}
     * @memberof MyCircularLinkedList
     */
    private getNode(value: T): MyNode<T> {
        let tempID: string = new MyNode<T>().setValue(value).ID();

        if (this.nodeMap.has(tempID)) {
            return this.nodeMap.get(tempID);
        }
        else {
            return null;
        }
    }

    /**
     * Removes a node from this list. This one uses the node map to find the node
     * TODO: This can be cleaned up
     * @param targetNode Node to be removed
     * @param previousNode optional, the node before the target node. If not supplied the method will find it manually. Ignored in this version
     * @returns The node previous to the one just deleted.
     */
    private removeNode(targetNode: MyNode<T>, previousNode2?: MyNode<T> ): MyNode<T> {
        let nodeList: Array<MyNode<T>>;
        let locatedNode: MyNode<T> = null;
        let previousNode: MyNode<T> = null;

        locatedNode = this.nodeMap.get(targetNode.ID());
        if (locatedNode) {
            previousNode = this.getPreviousNode(locatedNode);   //Store pointer to previous node before located node is deleted
            previousNode.setNextNode(locatedNode.getNextNode());
            this.nodeMap.delete(locatedNode.ID()); //removes the node from the hashmap
            locatedNode = null; //delete last pointer to node
            //TODO: Verify that head/tail pointers get updated
        }
        return previousNode;
    }

    /**
     * NOT YET IMPLEMENTED
     */
    public shuffle() {
    }


    /**
     * NOT YET IMPLEMENTED
     */
    public medianInsert() {
    }

    [Symbol.iterator](): Iterator<T> {
        let currentNode: MyNode<T> = this.head; //begins new iterator at the first node

        return {
            next() {
                let returnNode: MyNode<T> = currentNode;
                currentNode = currentNode.getNextNode();
                return {value: returnNode.getValue(), done: false};
            }

        }
        //throw new Error("Method not implemented.");
    }

    /**
     * Returns an ordered array of all the values in this circular linked list
     * @returns list
     */
    public toArray(): Array<T> {
        let values = new Array<T>();
        let tempCount = 0;
        let indexNode: MyNode<T> = this.head;

        do {
            if (indexNode.getValue() !== null) {
                values.push(indexNode.getValue());
                indexNode = indexNode.getNextNode();
                tempCount++;
            }
        } while (tempCount < this.size)

        return values;
    }
    /**
     * Returns an ordered array of all the nodes in this circular linked list
     * TODO: Consider storing this in a class property and clearing when it is out of date
     * @returns list
     */
    private enumerateNodes(): Array<MyNode<T>> {
        let returnArray = new Array<MyNode<T>>();
        let tempCount = 0;
        let indexNode: MyNode<T> = this.head;

        do {
            if (indexNode.getValue() !== null) {
                returnArray.push(indexNode);
                indexNode = indexNode.getNextNode();
                tempCount++;
            }
        } while (tempCount < this.size)

        return returnArray;
    }

}


class MyNode<T> { //Is there really no way to do a private inner class in Javascript

    private value: T;
    private nextNode: MyNode<T>;
    //private ID: string;
    private uniqueProperty: string;    //Name of function of T that is used to generate the ID for this object, defaulting to toString
    //private previousNode: myNode<T>;

    constructor(value: T = null, uniqueProperty: string = 'toString') {
        this.value = value;
        this.nextNode = null;
        this.uniqueProperty = uniqueProperty;
        //this.ID = value[this.uniqueProperty]();
    }

    public setNextNode(nextNode: MyNode<T>): MyNode<T> {
        this.nextNode = nextNode;
        return this;
    }

    public setValue(newValue: T): MyNode<T> {
        this.value = newValue;
        //this.ID = newValue[this.uniqueProperty]();
        return this;
    }

    public getValue(): T {
        return this.value;
    }
    
    public getNextNode(): MyNode<T> {
        return this.nextNode;
    }
    
    public ID(): string {
        return this.value[this.uniqueProperty]();
    }

}

export = MyCircularLinkedList;