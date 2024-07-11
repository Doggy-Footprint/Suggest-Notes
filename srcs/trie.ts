class LowerCaseCharMap<V> extends Map<string, Node<V>> {
    get(key: string): Node<V> | undefined;
    get(key: string, makeOne: true): Node<V>;
    get(key: string, makeOne: false): Node<V> | undefined;
    get(key: string, makeOne: boolean): Node<V> | undefined;
    get(key: string, makeOne: boolean = false): Node<V> | undefined {
        if (key.length === 0 || key.length > 1) return;
        const lowerCase = key.toLowerCase();
        let node = super.get(lowerCase);
        if (!node && makeOne) {
            node = new Node();
            this.set(lowerCase, node);
        }
        return node;
    }

    set(key: string, node: Node<V>): this {
        return super.set(key.toLowerCase(), node) as typeof this;
    }
}

export class PrefixTree<V> {
    private roots: LowerCaseCharMap<V> = new LowerCaseCharMap();

    add(query: string, content?: Content<V>) {
        if (query.length === 0) return;
        if (query.length === 1) {
            this.addRoot(query); 
            return;
        }
        if (query.startsWith(' ') || query.endsWith(' ')) return;

        let cursor = this.roots.get(query.charAt(0), true);

        for (let i = 1; i < query.length; i++) {
            cursor = cursor.getChildOfKey(query.charAt(i), true);
        }
        if (content) cursor.addContent(content, query);
    }

    private addRoot(key: string) {
        if (key.length !== 1) return;
        this.roots.set(key, new Node());
    }

    search(query: string): Node<V> | undefined {
        if (query.length === 0) return;
        if (query.length === 1) return this.roots.get(query);
        if (query.startsWith(' ') || query.endsWith(' ')) return;

        let cursor = this.roots.get(query.charAt(0));

        if (!cursor) return cursor;

        for (let i = 1; i < query.length; i++) {
            cursor = cursor.getChildOfKey(query.charAt(i));
            if (!cursor) return cursor;
        }

        return cursor;
    }

    delete(value: V, query: string) {
        const node = this.search(query);
        node?.deleteContent(value, query);
    }

    move(value: V, query: string, dest: string) {
        // TODO: check query and dest and reflect it on update
        const content = this.search(query)?.getContent(value);
        if (!content) return;
        this.delete(value, query);
        this.add(dest, content);
    }
}

export class Node<V> {
    private parent: Node<V> | null;

    // default valuse
    private children: LowerCaseCharMap<V> = new LowerCaseCharMap<V>();
    private contents: Set<Content<V>> = new Set();
    private suggestion: SortedArray<Content<V>> = new SortedArray<Content<V>>(Content.compare, Content.isSmallerThan);

    constructor(parent: Node<V> | null = null) {
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

    public addContent(content: Content<V>, keyword: string = '', updateSuggestion: boolean = true) {
        this.contents.add(content);
        content.updateNode(this);
        if (keyword.length > 0) content.addKeyword(keyword);
        if (updateSuggestion) this.updateSuggestionUptoRoot(content);
    }

    public getContent(value: V): Content<V> | undefined {
        for (const c of this.contents) {
            if (c.equal(value)) {
                return c;
            }
        }
        return;
    }

    public getContents(): Content<V>[] {
        return Array.from(this.contents);
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

    /**
     * 
     * @param keyword `keyword` must match to this node.
     * @param value 
     * @returns 
     */
    public deleteContent(value: V, keyword: string): boolean {
        let content: Content<V> | undefined = this.getContent(value);
        if (!content) return false;

        /**
         * TODO
         * how to gurantee atomicity of
         * delete Content in Node
         * delete keyword, Node in Content
         * update metadata of this and parents Nodes
         */
        content.deleteNode(this, keyword);
        this.contents.delete(content);
        this.updateSuggestionUptoRootAfterDeletion(content, keyword);
        return true;
    }

    // TODO
    public updateSuggestionUptoRootAfterDeletion(content: Content<V>, keyword: string) {
        /**
         * check keywords from content.
         * if there is keyword of which node is a descendant of `this` node, no update
         * else delete from current suggestion and call this method for parent.
         */
        let cursor: Node<V> | null = this;
        let keywordCursor = keyword.toLowerCase();
        const keywords: string[] = content.getAllKeywords().map(k => k.keyword.toLowerCase());
        
        while (cursor) {
            if (keywords.some(k => k.toLowerCase().startsWith(keywordCursor))) return;
            const deleted = cursor.suggestion.deleteElement(content);
            if (!deleted) break;
            keywordCursor = keywordCursor.slice(0, -1);
            cursor = cursor.parent;
        }
    }
}

export class Keyword {
    keyword: string;
    private useCount: number;

    constructor(keyword: string, useCount: number = 0) {
        this.keyword = keyword;
        this.useCount = useCount;
    }

    public udpateUsage() {
        this.useCount++;
    }

    public getScore(): number {
        return this.useCount;
    }

    public static compare(a: Keyword, b: Keyword): number {
        return b.getScore() - a.getScore();
    }

    public static isSmallerThan(a: Keyword, b: Keyword): boolean {
        return a.getScore() < b.getScore();
    }

    public static equal(a: Keyword, b: Keyword): boolean {
        return a.keyword === b.keyword;
    }
}

export class Content<V> {
    private value: V;
    private node: Set<Node<V>> = new Set();
    private useCount: number;
    private keywords: SortedArray<Keyword> 
        = new SortedArray(Keyword.compare, Keyword.isSmallerThan, Keyword.equal);
    // consider serialization for metadata such as useCount, { keyword: string, count: number }, lastUse, etc.
    // TODO consider update and configuration migration.

    constructor(value: V) {
        this.value = value;
        this.useCount = 0;
    }

    public cleanUp() {
        
    }

    /**
     * read value and update metadata, which is used for scoring each content when suggesting
     * @param udpate added for testing TODO: How to test getter with state change?
     * @returns 
     */
    public read(udpate: boolean = true): V {
        if (udpate) {
            this.useCount++;
            this.node.forEach(n => n.updateSuggestionUptoRoot(this));
        }
        return this.value;
    }

    public getScore(): number {
        return this.useCount;
    }

    public updateNode(node: Node<V>) {
        this.node.add(node);
    }

    public deleteNode(node: Node<V>, keyword: string): boolean {
        const index = this.keywords
                            .getAsArray()
                            .findIndex(k => k.keyword === keyword);
        if (index == -1) return false;
        // TODO how to guarantee to delete node and keyword atomically?
        // And more importantly, how to handle erroneous case? like one is deleted yet the other does not exist
        this.node.delete(node);
        this.keywords.delete(index);
        return true;    
    }
    
    getKeywords(prefix: string): Keyword[] {
        const lowPrefix = prefix.toLowerCase();
        return this.keywords.getAsArray().filter(k => k.keyword.toLowerCase().startsWith(lowPrefix));
    }

    getAllKeywords(): Keyword[] {
        return this.keywords.getAsArray();
    }

    public addKeyword(keyword: string) {
        this.keywords.add(new Keyword(keyword));
    }

    public updateKeywords(keyword: string) {
        const lowKeyword = keyword.toLowerCase();
        const element = this.keywords.getAsArray().find(k => k.keyword.toLowerCase() === lowKeyword);
        if (!element) return;
        element.udpateUsage();
        this.keywords.add(element);
    }

    equal(value: V) {
        return this.value === value;
    }

    /**
     * compare method used to sorting Content objects in descending order
     * @param a 
     * @param b 
     * @returns 
     */
    public static compare<T>(a: Content<T>, b: Content<T>): number {
        return b.getScore() - a.getScore();
    }

    public static isSmallerThan<T>(a: Content<T>, b: Content<T>): boolean {
        return a.getScore() < b.getScore();
    }
}

/**
 * Class which keeps Content objects in descending order
 */
class SortedArray<T> {
    private contents: T[] = [];
    private sortFn: (a: T, b: T) => number;
    private isSmallerThanFn: (a: T, b: T) => boolean;
    private equalFn: (a: T, b: T) => boolean;

    constructor(sortFn: (a: T, b: T) => number, isSmallerThanFn: (a: T, b: T) => boolean, eqaulFn?: (a: T, b: T) => boolean) {
        this.sortFn = sortFn;
        this.isSmallerThanFn = isSmallerThanFn;
        this.equalFn = eqaulFn ?? ((a, b) => a === b);
    }

    add(content: T): undefined;
    add(content: T, getResult: true): boolean;
    add(content: T, getResult: false): undefined;
    add(content: T, getResult: boolean): boolean | undefined;
    // TODO: refactor after test
    public add(content: T, getResult: boolean = false): boolean | undefined {
        const original = [...this.contents];
        const index = this.contents.findIndex((c => this.equalFn(c, content)));
        if (index === -1) {
            this.contents.push(content);
        }
        this.sort(); // stable
        if (original.length !== this.contents.length) return true;
        for (let i = 0; i < original.length; i++) {
            if (!this.equalFn(original[i], this.contents[i])) return true;
        }
        return false;
    }

    public deleteElement(element: T): boolean {
        const index = this.contents.findIndex(c => c === element);
        if (index === -1) return false;
        this.delete(index);
        return true;
    }

    public delete(index: number) {
        this.contents = [...this.contents.slice(0, index), ...this.contents.slice(index + 1)];
    }

    private sort() {
        this.contents.sort(this.sortFn);
    }

    getAsArray(): T[] {
        return this.contents;
    }
}