export class Trie {
    roots: Map<string, Node>;

    constructor(roots?: Map<string, Node>) {
        this.roots = roots?? new Map<string, Node>();
    }

    /**
     * Add a new Node to this Trie. This method does nothing for empty `fullstr`.
     * If `material` is provided, it will be added to the target node.
     * @param fullstr string to add. Provide non-empty `fullstr`
     * @param material NodeMaterial for new Node
     * @returns 
     */
    addNode(fullstr: string, material?: NodeMaterial) {
        if (fullstr.length == 0) return;
        const firstChar = fullstr.charAt(0);
        let root = this.roots.get(firstChar);
        if (!root) {
            root = new Node();
            this.roots.set(firstChar, root);
        }
        if (fullstr.length == 1) return;

        root.addNode(fullstr.slice(1), material);
    }

    /**
     * Find a Node by `query`. It returns null for empty `query`
     * @param query query string for Node.
     * @returns Found Node or null
     */
    findNode(query: string): Node | null {
        let nodeSet = this.roots;

        for (const char of query.slice(0, -1)) {
            const children = nodeSet.get(char)?.children;
            if (!children) return null;
            nodeSet = children;
        }

        return nodeSet.get(query.slice(-1)) ?? null;
    }

    suggestNodeMaterials(query: string): NodeMaterial[] {
        if (query.length == 0) return [];

        const queryNode = this.findNode(query);

        return [];
    }
}

export class Node {
    children: Map<string, Node>; // not-null
    parent: Node | null;
    metadata: NodeMetadata; // not-null
    materials: NodeMaterial[];

    constructor(parent: Node | null = null, materials?: NodeMaterial[] | null) {
        this.parent = parent;
        this.children = new Map<string, Node>();

        // additional information such as metadata and materials set via other methods.
        this.metadata = new NodeMetadata();
        this.materials = materials ?? [];
    }

    /**
     * This method replaces addChild.
     * Find and return child with given `key`, and if there is no such child, add child.
     * @param key sould be length == 1 string.
     * @returns child with given key
     */
    getChildOfKey(key: string): Node | null {
        if(key.length !== 1) return null;

        const node = this.children.get(key);
        if (node) return node;

        const child = new Node(this);
        this.children.set(key, child);
        return child;
    }

    /**
     * Add a Node with `fullstr` assuming this Node as a root.
     * @param fullstr string of node to add excludes the first char for current node. 
     * It ignores empty string.
     * @param material If exists, it is added to the target node.
     */
    addNode(fullstr: string, material?: NodeMaterial) {
        if (fullstr.length == 0) return;

        let cursor: Node = this;

        for (const key of fullstr) {
            cursor = cursor.getChildOfKey(key)!;
        }
        
        if (material) cursor.addMaterial(material, true);
    }

    addMaterial(material: NodeMaterial, updateAncestorMetadata: boolean) {
        this.materials.push(material);
        material.moveNode(this);

        if (updateAncestorMetadata && this.parent)
            this.parent.updateParentMetadataUptoRoot(material);
    }

    addMaterials(materials: NodeMaterial[], updateAncestorMetadata: boolean) {
        this.materials.push(...materials);
        materials.forEach(m => m.moveNode(this));

        if (updateAncestorMetadata && this.parent) {
            this.parent.updateParentMetadataUptoRoot(materials);
        }
    }

    // refactor
    updateParentMetadataUptoRoot(changes: NodeMaterial | NodeMaterial[]) {
        var cursor: typeof this.parent = this;
        
        if (changes instanceof NodeMaterial) {
            while (cursor?.metadata.updatePromisingMaterial(changes)) {
                cursor = cursor.parent;
            }
        } else if (Array.isArray(changes)){
            while (cursor?.metadata.updatePromisingMaterials(changes)) {
                cursor = cursor.parent;
            }
        }
    }

    getMaterial(content: any): NodeMaterial | null {
        return this.materials.find(m => m.hasContent(content)) ?? null;
    }

    getMaterials(): NodeMaterial[] {
        return this.materials;
    }
}

export class NodeMetadata {
    private static readonly cutoff = 5;

    promisingMaterials: NodeMaterial[]; // not-null

    constructor() {
        this.promisingMaterials = [];
    }

    // refactor for efficiency
    updatePromisingMaterial(material: NodeMaterial): boolean {
        if (this.promisingMaterials.length == 0) {
            this.promisingMaterials.push(material);
            return true;
        }
        
        if (this.promisingMaterials.some(m => m.equal(material))) {
            this.promisingMaterials.sort((a, b) => this.getSortScore(b) - this.getSortScore(a));
            return true;
        }

        const index = this.promisingMaterials.findIndex(m => this.getSortScore(m) <= this.getSortScore(material));

        if (index == -1) return false;

        this.promisingMaterials 
            = [...this.promisingMaterials.slice(0, index), material, ...this.promisingMaterials.slice(index)]
                .slice(0, NodeMetadata.cutoff);
        return true;
    }

    // refactor for efficiency
    updatePromisingMaterials(materials: NodeMaterial[]): boolean {
        materials.forEach(nm => {
            if (!this.promisingMaterials.some(em => em.equal(nm)))
                this.promisingMaterials.push(nm);
        })
        this.promisingMaterials.sort((a, b) => this.getSortScore(b) - this.getSortScore(a));

        // not implemented - this method currently doesn't check if metadata is updated or not.
        return true;
    }

    getSortScore(material: NodeMaterial): number {
        return material.useCount;
    }
}

export class NodeMaterial {
    content: any;
    node: Node | null;

    useCount: number;

    constructor(content: any, node: Node | null = null) {
        this.content = content;
        this.node = node;
        this.useCount = 0;
    }

    moveNode(node: Node) {
        if (this.node) {
            const index = node.materials.findIndex(m => m.equal(this));
            if (index >= 0) {
                node.materials.splice(index, 1);
                // TODO: remove current material from metadata upto root.
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
        this.node?.updateParentMetadataUptoRoot(this);
    }

    equal(material: NodeMaterial): boolean {
        return this.content == material.content;
    }

    hasContent(content: any): boolean {
        return this.content === content;
    }
}