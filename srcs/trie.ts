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

        for (let i = 1; i < str.length; i++) {
            cursor = cursor.getChildOfKey(str.charAt(i), true);
        }
        if (content) cursor.addContent(content);
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

        for (let i = 1; i < str.length; i++) {
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
    private suggestion: SortedArray<Content> = new SortedArray<Content>(Content.compare, Content.isSmallerThan);

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
        const child = this.children.get(key, makeOne);
        if (child) child.parent = this;
        return child;
    }

    public addContent(content: Content, updateSuggestion: boolean = true) {
        this.contents.push(content);
        content.updateNode(this);
        if (updateSuggestion) this.updateSuggestionUptoRoot(content);
    }

    public deletContent(content:Content, updateSuggestion: boolean = true) {
        // update Suggestion of this and parents upto the root
    }

    public getContents(): Content[] {
        return this.contents;
    }

    public getSuggestion(): Content[] {
        return this.suggestion.getAsArray();
    }

    // NOTE: this method is used for add
    public updateSuggestionUptoRoot(content: Content) {
        let cursor: Node | null = this;
        // refactor: stop if root already has its own suggest and there is no need to update
        while (cursor) {
            cursor.suggestion.add(content)
            cursor = cursor.parent;
        }
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
     * @param udpate added for testing TODO: How to test getter with state change?
     * @returns 
     */
    public getContent(udpate: boolean = true): any {
        if (udpate) {
            this.useCount++;
            this.node?.updateSuggestionUptoRoot(this);            
        }
        return this.content;
    }

    public getContentScore(): number {
        return this.useCount;
    }

    public updateNode(node: Node) {
        this.node = node;
    }

    public moveNode(str: string) {
        // TODO
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

    public static isSmallerThan(a: Content, b: Content): boolean {
        return a.getContentScore() < b.getContentScore();
    }
}

/**
 * Class which keeps Content objects in descending order
 */
class SortedArray<T> {
    private contents: T[] = [];
    private sortFn: (a: T, b: T) => number;
    private isSmallerThanFn: (a: T, b: T) => boolean;

    constructor(sortFn: (a: T, b: T) => number, isSmallerThanFn: (a: T, b: T) => boolean) {
        this.sortFn = sortFn;
        this.isSmallerThanFn = isSmallerThanFn;
    }

    add(content: T): undefined;
    add(content: T, getResult: true): boolean;
    add(content: T, getResult: false): undefined;
    add(content: T, getResult: boolean): boolean | undefined;
    // TODO: refactor after test
    public add(content: T, getResult: boolean = false): boolean | undefined {
        const original = [...this.contents];
        const index = this.contents.findIndex((c => c === content));
        if (index === -1) {
            this.contents.push(content);
        }
        this.sort();
        if (original.length !== this.contents.length) return true;
        for (let i = 0; i < original.length; i++) {
            if (original[i] !== this.contents[i]) return true;
        }
        return false;
    }

    public delete(content: T) {
        // TODO later
    }

    private sort() {
        this.contents.sort(this.sortFn);
    }

    getAsArray(): T[] {
        return this.contents;
    }
}