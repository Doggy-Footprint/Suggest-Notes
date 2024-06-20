export class Trie {
    // TODO: don't allow duplicate
    roots: Map<string, Node>;

    constructor(roots?: Map<string, Node>) {
        this.roots = roots?? new Map<string, Node>();
    }

    addNode(fullstr: string, material: NodeMaterial) {
        const firstChar = fullstr.charAt(0);
        let root = this.roots.get(firstChar);
        if (!root) {
            root = new Node();
            this.roots.set(firstChar, root);
        }

        root.addNode(fullstr, material);
    }

    findNode(query: string): Node | null {
        let nodeSet = this.roots;

        for (const char of query.slice(0, -1)) {
            const children = nodeSet.get(char)?.children;
            if (!children) return null;
            nodeSet = children;
        }

        return nodeSet.get(query.slice(-1)) ?? null;
    }
}

export class Node {
    children: Map<string, Node>; // not-null // TODO: make children a Set object.
    parent: Node | null;
    metadata: NodeMetadata; // not-null
    materials: NodeMaterial[];

    constructor(materials?: NodeMaterial[] | null, parent: Node | null = null) {
        this.parent = parent;
        this.children = new Map<string, Node>();
        // additional information such as metadata and materials set via other methods.
        this.metadata = new NodeMetadata();
        this.materials = materials ?? [];
    }

    addChild(key: string, child: Node) {
        // TODO: duplicate nodeChar check.
        this.children.set(key, child);
        child.parent = this;
    }

    /**
     * Key function - form TRIE tree, Node with material is additional feature
     * @param root 
     * @param fullstr full string includig this node's key
     * @param material 
     */
    addNode(fullstr: string, material?: NodeMaterial) {
        let newNode = new Node();
        let cursor: Node = this;
        for (const key of fullstr.slice(1, -1)) {
            cursor = cursor.getChildOfKey(key);
        }
        cursor.addChild(fullstr.slice(-1), newNode);
        if (material) newNode.addMaterial(material, true);
    }

    getChildOfKey(key: string): Node {
        let child = this.children.get(key);
        if (!child) {
            child = new Node(null, this);
            this.children.set(key, child);
        }        
        return child;
    }

    addMaterial(material: NodeMaterial, updateAncestorMetadata: boolean) {
        this.materials.push(material);
        material.moveNode(this);

        if (updateAncestorMetadata && this.parent)
            //TODO update parameter to [material]
            this.parent.updateParentMetadataUptoRoot(material);
    }

    // TODO: get NodeMaterial[]
    updateParentMetadataUptoRoot(material: NodeMaterial) {
        var cursor: typeof this.parent = this;
        while (cursor?.metadata.updatePromisingMaterial(material)) {
            cursor = cursor.parent;
        }
    }
}

export class NodeMetadata {
    private static readonly cutoff = 5;

    promisingMaterials: NodeMaterial[];

    constructor() {
        this.promisingMaterials = [];
    }

    updatePromisingMaterial(material: NodeMaterial): boolean {
        
        if (this.promisingMaterials.some(m => m.isEqaul(material))) return true;
        
        if (this.promisingMaterials.length == 0) {
            this.promisingMaterials.push(material);
            return true;
        }

        const index = this.promisingMaterials.findIndex(m => this.calculateImportance(m) <= this.calculateImportance(material));

        if (index == -1) return false;

        this.promisingMaterials 
            = [...this.promisingMaterials.slice(0, index), material, ...this.promisingMaterials.slice(index)]
                .slice(0, NodeMetadata.cutoff);
        return true;
    }

    /**
     * calculate suggesting perference of material.
     * @param material 
     * @returns 
     */
    calculateImportance(material: NodeMaterial): number {
        return material.useCount;
    }
}

export class NodeMaterial {
    content: any;
    node: Node | null;

    useCount: number;

    constructor(content: string, node: Node | null = null) {
        this.content = content;
        this.node = node;
        this.useCount = 0;
    }

    moveNode(node: Node) {
        if (this.node) {
            const index = node.materials.findIndex(m => m.isEqaul(this));
            if (index >= 0) {
                node.materials.splice(index, 1);
            //node.metadata.updatePromisingMaterial(node.materials); TODO - after change updatePromisingMaterial
            }
        }

        this.node = node;
    }
    
    readContent() {
        this.updateUsage();
        return this.content;
    }

    updateUsage() {
        this.useCount++;
        // TODO update to use [this]
        this.node?.updateParentMetadataUptoRoot(this);
    }

    isEqaul(material: NodeMaterial): boolean {
        return this.content == material.content;
    }
}