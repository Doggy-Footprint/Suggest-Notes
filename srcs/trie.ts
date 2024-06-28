class CharMap<V> extends Map<string, Node<V>> {
    get(key: string): Node<V> | undefined;
    get(key: string, makeOne: true): Node<V>;
    get(key: string, makeOne: false): Node<V> | undefined;
    get(key: string, makeOne: boolean): Node<V> | undefined;
    get(key: string, makeOne: boolean = false): Node<V> | undefined {
        if (key.length === 0 || key.length > 1) return;
        let node = super.get(key);
        if (!node && makeOne) {
            node = new Node(key);
            this.set(key, node);
        }
        return node;
    }
}

export class PrefixTree<V> {
    private roots: CharMap<V> = new CharMap();

    add(str: string, content?: Content<V>) {
        const lowStr = str.toLowerCase();
        if (lowStr.length === 0) return;
        if (lowStr.length === 1) {
            this.addRoot(lowStr); 
            return;
        }
        if (str.startsWith(' ') || str.endsWith(' ')) return;

        let cursor = this.roots.get(lowStr.charAt(0), true);

        for (let i = 1; i < lowStr.length; i++) {
            cursor = cursor.getChildOfKey(lowStr.charAt(i), true);
        }
        if (content) cursor.addContent(content, str);
    }

    private addRoot(key: string) {
        if (key.length !== 1) return;
        this.roots.set(key, new Node(key));
    }

    // TODO: use only lower case
    search(str: string): Node<V> | undefined {
        const lowStr = str.toLowerCase();
        if (lowStr.length === 0) return;
        if (lowStr.length === 1) return this.roots.get(lowStr);
        if (str.startsWith(' ') || str.endsWith(' ')) return;

        let cursor = this.roots.get(lowStr.charAt(0));

        if (!cursor) return cursor;

        for (let i = 1; i < lowStr.length; i++) {
            cursor = cursor.getChildOfKey(lowStr.charAt(i));
            if (!cursor) return cursor;
        }

        return cursor;
    }
}

export class Node<V> {
    private readonly key: string;
    private parent: Node<V> | null;
    private keyword: string | undefined;

    // default valuse
    private children: CharMap<V> = new CharMap<V>();
    private contents: Content<V>[] = [];
    private suggestion: SortedArray<Content<V>> = new SortedArray<Content<V>>(Content.compare, Content.isSmallerThan);

    constructor(key: string, parent: Node<V> | null = null) {
        this.key = key;
        this.parent = parent;
    }

    getChildOfKey(key: string): Node<V> | undefined;
    getChildOfKey(key: string, makeOne: true): Node<V>;
    getChildOfKey(key: string, makeOne: false): Node<V> | undefined;
    getChildOfKey(key: string, makeOne: boolean): Node<V> | undefined;
    public getChildOfKey(key: string, makeOne: boolean = false): Node<V> | undefined{
        if (key.length !== 1) return;
        const child = this.children.get(key, makeOne);
        if (child) child.parent = this;
        return child;
    }

    public addContent(content: Content<V>, keyword: string, updateSuggestion: boolean = true) {
        this.contents.push(content);
        this.keyword = keyword;
        content.updateNode(this);
        if (updateSuggestion) this.updateSuggestionUptoRoot(content);
    }

    public deletContent(content:Content<V>, updateSuggestion: boolean = true) {
        // update Suggestion of this and parents upto the root
    }

    public getContents(): Content<V>[] {
        return this.contents;
    }

    public getSuggestion(): Content<V>[] {
        return this.suggestion.getAsArray();
    }

    // NOTE: this method is used for add
    public updateSuggestionUptoRoot(content: Content<V>) {
        let cursor: Node<V> | null = this;
        // refactor: stop if root already has its own suggest and there is no need to update
        while (cursor) {
            cursor.suggestion.add(content)
            cursor = cursor.parent;
        }
    }

    public getKeyword(): string | undefined {
        return this.keyword;
    }
}

export class Content<V> {
    private content: V;
    private node: Node<V> | null;
    private useCount: number;

    constructor(content: V, node: Node<V> | null = null) {
        this.content = content;
        this.node = node;
        this.useCount = 0;
    }

    /**
     * get content.
     * @param udpate added for testing TODO: How to test getter with state change?
     * @returns 
     */
    public getContent(udpate: boolean = true): V {
        if (udpate) {
            this.useCount++;
            this.node?.updateSuggestionUptoRoot(this);            
        }
        return this.content;
    }

    public getContentScore(): number {
        return this.useCount;
    }

    public updateNode(node: Node<V>) {
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
    public static compare<T>(a: Content<T>, b: Content<T>): number {
        return b.getContentScore() - a.getContentScore();
    }

    public static isSmallerThan<T>(a: Content<T>, b: Content<T>): boolean {
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