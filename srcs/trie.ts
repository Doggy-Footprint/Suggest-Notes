export class PrefixTree {
    private roots: Map<string, Node> = new Map<string, Node>();

    add(str: string) {
        // TODO: implement in TDD greening
    }

    search(str: string): Node | null {
        // TODO: implement in TDD greening
        return null;
    }
}

export class Node {
    private readonly key: string;
    private parent: Node | null;

    // default valuse
    private children: Map<string, Node> = new Map<string, Node>();

    constructor(key: string, parent: Node | null = null) {
        this.key = key;
        this.parent = parent;
    }

    getChildOfKey(key: string, makeOne: boolean): Node | null{
        if (key.length !== 1) return null;
        // TODO: implement in TDD greening
        return null;
    }
}