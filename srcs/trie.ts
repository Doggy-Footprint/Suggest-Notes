class CharMap extends Map<string, Node> {
    get(key: string): Node | undefined;
    get(key: string, makeOne: true): Node;
    get(key: string, makeOne: false): Node | undefined;
    get(key: string, makeOne: boolean): Node | undefined;
    get(key: string, makeOne: boolean = false): Node | undefined {
        if (key.length === 0 || key.length > 1) return;
        let node = super.get(key);
        if (!node && makeOne) {
            node = new Node(key);
            this.set(key, node);
        }
        return node;
    }
}

export class PrefixTree {
    private roots: CharMap = new CharMap();

    add(str: string, content?: Content) {
        if (str.length === 0) return;
        if (str.length === 1) {
            this.addRoot(str); 
            return;
        }

        let cursor = this.roots.get(str.charAt(0), true);

        for (let i = 0; i < str.length; i++) {
            cursor = cursor.getChildOfKey(str.charAt(i), true);
        }
    }

    private addRoot(key: string) {
        if (key.length !== 1) return;
        this.roots.set(key, new Node(key));
    }

    search(str: string): Node | undefined {
        if (str.length === 0) return;
        if (str.length === 1) return this.roots.get(str);

        let cursor = this.roots.get(str.charAt(0));

        if (!cursor) return cursor;

        for (let i = 0; i < str.length; i++) {
            cursor = cursor.getChildOfKey(str.charAt(i));
            if (!cursor) return cursor;
        }

        return cursor;
    }
}

export class Node {
    private readonly key: string;
    private parent: Node | null;

    // default valuse
    private children: CharMap = new CharMap();
    private contents: Content[] = [];
    private suggestion: SortedArray<Content> = new SortedArray<Content>(Content.compare);

    constructor(key: string, parent: Node | null = null) {
        this.key = key;
        this.parent = parent;
    }

    getChildOfKey(key: string): Node | undefined;
    getChildOfKey(key: string, makeOne: true): Node;
    getChildOfKey(key: string, makeOne: false): Node | undefined;
    getChildOfKey(key: string, makeOne: boolean): Node | undefined;
    public getChildOfKey(key: string, makeOne: boolean = false): Node | undefined{
        if (key.length !== 1) return;

        return this.children.get(key, makeOne);
    }

    addContent(content: Content, updateSuggestion: boolean = true) {
        // update Suggestion of this and parents upto the root
    }

    deletContent(content:Content, updateSuggestion: boolean = true) {
        // update Suggestion of this and parents upto the root
    }

    getContents(): Content[] {
        return [];
    }

    getSuggestion(): Content[] {
        // return this.suggestion in form of Content[].
        return [];
    }
}

export class Content {
    private content: any;
    private node: Node | null;
    private useCount: number;

    constructor(content: any, node: Node | null = null) {
        this.content = content;
        this.node = node;
        this.useCount = 0;
    }

    /**
     * get content.
     * TODO: this method update its own data to evaluate its score to sort. 
     * And this should call it's `node`'s method to update suggestions.
     * @returns 
     */
    public getContent(): any {
        return 'stub!';
    }

    public getContentScore(): number {
        return 0;
    }

    public moveNode(str: string) {

    }

    /**
     * compare method used to sorting Content objects in descending order
     * @param a 
     * @param b 
     * @returns 
     */
    public static compare(a: Content, b: Content): number {
        return b.getContentScore() - a.getContentScore();
    }

    public isSmallerThan(content: Content): boolean {
        return this.getContentScore() < content.getContentScore();
    }
}

/**
 * Class which keeps Content objects in descending order
 */
class SortedArray<T> {
    private contents: T[] = [];
    private compareFn: (a: T, b: T) => number;

    constructor(compareFn: (a: T, b: T) => number) {
        this.compareFn = compareFn;
    }

    public add(content: Content) {
        
    }

    public delete(content: Content) {

    }

    private sort() {
        this.contents.sort(this.compareFn);
    }
}