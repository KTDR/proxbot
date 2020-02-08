//import Util from './MyDiscordUtils';
/**
 * A very basic circular linked list structure meant primarily for my stream checker utility. Can be used as a set through constructor options.
 * Single linked for now, will be upgraded to double linked if I have the time.
 * TODO: When comparing objects do so by hashcodes?
 * TODO: Add comparator method to streamer objects, compare by username
 */
class MyCircularLinkedList<T> implements Iterable<T> {

    private head: MyNode<T>;
    private tail: MyNode<T>;
    private size: number;
    private comparator: Function;
    private useSet: boolean;    //enables use of this list as a set

    constructor(options: string = "") {
        this.head = new MyNode();
        this.tail = new MyNode();
        this.size = 0;
        this.useSet = options.includes("-useSet");
        console.log( "using set " + this.useSet);
        this.comparator = function(o1: T, o2: T) { return (o1 === o2) };    //default comparator for objects in this list, can be replaced using setComparator()

        this.tail.setNextNode(this.head);
        this.head.setNextNode(this.tail);
    }

    public addToEnd(value: T | T[]): MyCircularLinkedList<T> {
        let newNode: MyNode<T>;

        if (value instanceof Array) {
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
                this.size++;
            }

            else if (this.size === 1) {
                this.tail.setValue(value);
                this.size++;
            }

            else if (this.size >= 2) {
                newNode = new MyNode<T>(value);
                newNode.setNextNode(this.head);
                this.tail.setNextNode(newNode);
                this.tail = newNode;
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

    //testing function for use as a set
    public runDuplicateTest(): void {
        let tester = new MyCircularLinkedList<number>("-useSet");

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

        for (let n of this) {
            objectList.push(n);
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
     * @param comparator Comparator function to be used, if no argument is passed will use the default javascript object comparison
     */
    public setComparator(comparator?: Function) {
        comparator ? this.comparator = comparator : this.comparator = function(o1: T, o2: T) { return (o1 === o2) };
    }
    
    /**
     * Remove any duplicates from this list 
     * @param comparator Optionally set a comparator used to check for duplicates, defaults to comparator already assigned in the function
     */
    public removeDuplicates(comparator = this.comparator) {  //Sadly seems like javascript doesn't have anything similar to the comparable interface in java
        let tempArray = new Array<T>(); //Array of node values to help check for duplicates
        let indexNode: MyNode<T> = this.head;
        let previousNode: MyNode<T> = this.tail;
        let delCount = 0, runCount = 0;   //For testing
        let start = true;   //So the main loop will run the first time
    
        console.log("Starting at " + indexNode.getValue())
        while (!(indexNode === this.head && start === false)) {
            start = false;
            if (tempArray.some(element => comparator(indexNode.getValue(), element))) { //if there is a match
                let head = false, tail = false;
                if (indexNode === this.head) {
                    console.log("head");
                    head = true;
                }
                else if (indexNode == this.tail) {
                    console.log("tail");
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
        
                console.log("deleted " + ++delCount + " nodes ");
            }
            else { //if there is no match
                tempArray.push(indexNode.getValue());
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


    public remove(value: T, comparator = this.comparator): boolean {
        let found: boolean = false;
        let nodeList : MyNode<T>[] = this.enumerateNodes();

        for (let i = 0; i < nodeList.length && !found; i++) {
            if (comparator(value, nodeList[i].getValue())){
                found = true;
                this.removeNode(nodeList[i]);
            }
        }

        return found;
    }

    public getSize(): number {
        return this.size;
    }
    
    /**
     * Returns true if there is at least one instance of this value in the list
     * @param value Value to check for
     */
    public contains(value: T): boolean {
        return this.toArray().some(element => this.comparator(element, value));
    }

    /**
     * Fetches and returns the first matching object
     */
    public fetch(value: T): T {
        let targetNode = null;
        for (let n in this) {
            if (this.comparator(n, value)) {
                targetNode = n;
                break;
            }
        }
        return targetNode;
    }
    /**
     * Removes a node from this list.
     * TODO: This can be cleaned up
     * @param targetNode Node to be removed
     * @param previousNode optional, the node before the target node. If not supplied the method will find it manually.
     * @returns The node previous to the one just deleted.
     */
    private removeNode(targetNode: MyNode<T>, previousNode?: MyNode<T> ): MyNode<T> {
        let nodeList: Array<MyNode<T>>;

        if (previousNode) {
            previousNode.setNextNode((targetNode.getNextNode()));
            targetNode.setNextNode(null);
            this.size--;
            return previousNode;
        }
        else {  //if the previous node is no supplied it must be found manually.
            for(let n of this.enumerateNodes()) {
                if ( n.getNextNode() === targetNode) {
                    this.removeNode(targetNode, n);
                }
            }
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

    //Iterator
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
    //private previousNode: myNode<T>;

    constructor(value: T = null) {
        this.value = value;
        this.nextNode = null;
    }

    public setNextNode(nextNode: MyNode<T>): void {
        this.nextNode = nextNode;
    }

    public setValue(newValue: T) {
        this.value = newValue;
    }

    public getValue(): T {
        return this.value;
    }
    
    public getNextNode(): MyNode<T> {
        return this.nextNode;
    }
}

export = MyCircularLinkedList;