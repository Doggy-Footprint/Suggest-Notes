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

    add(str: string) {
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
        // static type check dodging. boolean won't match for true / false in static type check (becuase compiler doesn't know.)
        return this.children.get(key, makeOne);
    }
}