import { measureFinerLatency } from 'srcs/profiling';

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

    /**
     * 
     * @param query case-insensitive query string
     * @param content 
     * @returns 
     */
    add(query: string, content?: Content<V>, statistic?: Statistic) {
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
        if (content) cursor.addContent(content, query, statistic);
    }

    private addRoot(key: string) {
        if (key.length !== 1) return;
        if (!this.roots.has(key))
            this.roots.set(key, new Node()); 
    }

    /**
     * 
     * @param query case-insensitive query string
     * @returns 
     */
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

    /**
     * 
     * @param value 
     * @param keyword case-sensitive keyword of Content object
     */
    delete(keyword: string, value: V) {
        const node = this.search(keyword);
        node?.deleteContent(value, keyword);
    }

    /**
     * 
     * @param value 
     * @param keyword case-sensitive keyword of Content object
     * @param dest case-sensitive keyword of Content object
     * @returns 
     */
    move(keyword: string, dest: string, value: V) {
        const content = this.search(keyword)?.getContent(value);
        if (!content) return;
        this.delete(keyword, value);
        this.add(dest, content);
    }
}

export class Node<V> {
    private parent: Node<V> | null;

    // default valuse
    private children: LowerCaseCharMap<V> = new LowerCaseCharMap<V>();
    private contents: Set<Content<V>> = new Set();
    private suggestion: SortedArray<Content<V>> = new SortedArray<Content<V>>(Content.compareDesc);

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

    public addContent(content: Content<V>, keyword: string, statistic?: Statistic) {
        this.contents.add(content);
        content.updateNode(this);
        if (keyword.length > 0) content.addKeyword(keyword, statistic);
        this.updateSuggestionUptoRoot(content);
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
     * If keyword is not provided, it measn this content with `value` will be deleted entirely
     * @param value 
     * @returns 
     */
    public deleteContent(value: V, keyword?: string): boolean {
        let content: Content<V> | undefined = this.getContent(value);
        if (!content) return false;

        content.deleteNode(this, keyword);
        if (!keyword || !content.getAllKeywords().map(k => k.keyword.toLowerCase()).some(k => k === keyword.toLowerCase())) {
            // node is case-ignoring and keywords in Content are not.
            // Thus we need to check if there is no keyword remaining before delete and update.

            this.contents.delete(content);
            this.updateSuggestionUptoRootAfterDeletion(content, keyword);
        }
        return true;
    }

    /**
     * Propagate deletion of content in this node to its ancestors
     * @param content content to delete from suggestions of this node and all parents
     * @param keyword expect to be path to this node if provided.
     * @returns 
     */
    public updateSuggestionUptoRootAfterDeletion(content: Content<V>, keyword?: string) {
        /**
         * check keywords from content.
         * if there is keyword of which node is a descendant of `this` node, no update
         * else delete from current suggestion and call this method for parent.
         */
        let cursor: Node<V> | null = this;
        let keywordCursor = keyword?.toLowerCase();
        const keywords: string[] = keyword ? content.getAllKeywords().map(k => k.keyword.toLowerCase()) : [];
        
        while (cursor) {
            if (keywordCursor !== undefined && keywordCursor.length > 0) {
                // check if the content exists in one of descendant of this node. In that case, no update.
                // NOTE: this assume that there is no such case where parent has a content as suggestion but its child doesn't
                if (keywords.some(k => k.startsWith(keywordCursor!))) return;
                keywordCursor = keywordCursor.slice(0, -1);
            }
            // if there are no changes in cursor's suggestion, stop propagation
            const deleted = cursor.suggestion.deleteElement(content);
            if (!deleted) break;
            cursor = cursor.parent;
        }
    }
}

export class Keyword {
    keyword: string;
    private statistic: Statistic = new Statistic();

    constructor(keyword: string, statistic?: Statistic) {
        this.keyword = keyword;
        if (statistic) this.statistic = statistic;
    }

    public udpateUsage() {
        this.statistic.update();
    }

    public static compareDesc(a: Keyword, b: Keyword): number {
        return a.statistic.compareDesc(b.statistic);
    }

    public static equal(a: Keyword, b: Keyword): boolean {
        return a.keyword === b.keyword;
    }
}

export class Content<V> {
    private value: V;
    private statistic: Statistic = new Statistic();
    private nodes: Set<Node<V>> = new Set();
    private keywords: SortedArray<Keyword>
        = new SortedArray(Keyword.compareDesc, Keyword.equal);

    constructor(value: V, statistic?: Statistic) {
        this.value = value;
        if (statistic) this.statistic = statistic;
    }

    public cleanUp() {
        this.nodes.forEach(node => node.deleteContent(this.value));
    }

    /**
     * read value and update metadata, which is used for scoring each content when suggesting
     * @param udpate if `update` is true, read() reflect, and update metadata when read
     * @returns 
     */
    public read(udpate: boolean = true): V {
        if (udpate) {
            this.statistic.update()
            this.nodes.forEach(n => n.updateSuggestionUptoRoot(this));
        }
        return this.value;
    }

    public updateNode(node: Node<V>) {
        this.nodes.add(node);
    }

    public deleteNode(node: Node<V>, keyword?: string): boolean {
        if (keyword !== undefined) {
            const index = this.keywords
                            .getAsArray()
                            .findIndex(k => k.keyword === keyword);
            if (index == -1) return false;
            this.keywords.delete(index);
        }
        return this.nodes.delete(node);
    }
    
    getKeywords(prefix: string): Keyword[] {
        const lowPrefix = prefix.toLowerCase();
        return this.keywords.getAsArray().filter(k => k.keyword.toLowerCase().startsWith(lowPrefix));
    }

    getAllKeywords(): Keyword[] {
        return this.keywords.getAsArray();
    }

    public addKeyword(keyword: string, statistic?: Statistic) {
        this.keywords.add(new Keyword(keyword, statistic));
    }

    /**
     * 
     * @param keyword case specific keyword required
     * @returns 
     */
    public readWithKeyword(keyword: string) {
        const keywordElement = this.keywords.getAsArray().find(k => k.keyword === keyword);
        if (!keywordElement) return;
        keywordElement.udpateUsage();
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
    public static compareDesc<T>(a: Content<T>, b: Content<T>): number {
        return a.statistic.compareDesc(b.statistic);
    }
}

/**
 * Class which keeps Content objects in descending order
 */
class SortedArray<E> {
    private contents: E[] = [];
    private compareFn: (a: E, b: E) => number;
    private equalFn: (a: E, b: E) => boolean;

    constructor(compareFn: (a: E, b: E) => number, eqaulFn?: (a: E, b: E) => boolean) {
        this.compareFn = compareFn;
        this.equalFn = eqaulFn ?? ((a, b) => a === b);
    }

    add(content: E): undefined;
    add(content: E, getResult: true): boolean;
    add(content: E, getResult: false): undefined;
    add(content: E, getResult: boolean): boolean | undefined;
    /**
     * 
     * @param content 
     * @param getResult 
     * @returns if getResult is true, this method return true if the array is changed, and false otherwise.
     */
    public add(content: E, getResult: boolean = false): boolean | undefined {
        const index = this.contents.findIndex(c => this.equalFn(c, content));
        const placeIndex = this.contents.findIndex(c => this.compareFn(c, content) >= 0);

        let result: boolean | undefined;

        if (index === -1 && placeIndex === -1) {
            // does not exist, should be placed in the last

            this.contents.push(content);
            result = true;
        } else if (index === -1 && placeIndex !== -1/* for readability */) {
            // does not exist, should be inserted in the middle
            this.contents = [...this.contents.slice(0, placeIndex), content, ...this.contents.slice(placeIndex)];
            result = true;
        } else if (index !== -1/* for readability */ && placeIndex === -1) {
            // re-arranging existing element at last

            if (index === this.contents.length - 1) {
                // in case the element is already the last element.
                result = false; 
            } else {
                this.contents.splice(index, 1);
                this.contents.push(content);
                result = true;
            }
        } else if (index !== -1/* for readability */ && placeIndex !== -1) {
            // re-arranging existing element in the middle

            if (index === placeIndex) {
                // in case the element is in right place already.
                result = false;
            } else {
                this.contents.splice(index, 1);
                this.contents.splice(placeIndex, 0, content);
                result = true;
            }
        }

        if (getResult) return result;
    }

    public deleteElement(element: E): boolean {
        const index = this.contents.findIndex(c => c === element);
        if (index === -1) return false;
        this.delete(index);
        return true;
    }

    public delete(index: number) {
        if (index < 0 || index >= this.contents.length) return;
        this.contents.splice(index, 1);
    }

    private sort() {
        this.contents.sort(this.compareFn);
    }

    public getAsArray(): E[] {
        return this.contents;
    }
}

export class Statistic {
    /**
     * Statistic is used fro two places
     * 1. in Content to determine how is Content to be sorted in metadata of Node
     * 2. in Keyword to determine rendering Order
     */
    private useCount: number = 0;
    private lastUsed: Date = new Date();

    constructor(useCount?: number, lastUsed?: Date) {
        if (useCount) this.useCount = useCount;
        if (lastUsed) this.lastUsed = lastUsed;
    }

    public static getStatistic(jsonData?: any): Statistic {
        return new Statistic(jsonData?.useCount, jsonData?.lastUsed);
    }

    public update() {
        this.useCount++;
        this.lastUsed = new Date();
    }

    public compare(b: Statistic): number {
        let comp: number = this.useCount - b.useCount;
        if (comp === 0 ) comp = this.lastUsed.getTime() - b.lastUsed.getTime();
        
        return comp;
    }

    public compareDesc(b: Statistic): number {
        return this.compare(b) * -1
    }
}