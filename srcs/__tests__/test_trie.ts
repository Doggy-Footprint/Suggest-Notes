import { Trie, Node, NodeMetadata, NodeMaterial } from '../trie';

describe('Trie structure ', () => {
    let trie: Trie;

    beforeEach(() => {
        trie = new Trie();
    });

    // Basic Case
    test('Adding and finding single words', () => {
        trie.addNode('apple');
        expect(trie.findNode('apple')).not.toBeNull();
        expect(trie.findNode('appl')).not.toBeNull();
        expect(trie.findNode('apples')).toBeNull();
    });

    // Empty String Case - Add
    test('Adding empty string', () => {
        expect(trie.findNode('')).toBeNull();
        trie.addNode('');
        expect(trie.findNode('')).toBeNull();
    });

    test('Searching in trie', () => {
        trie.addNode('bat');
        trie.addNode('ball');
        expect(trie.findNode('bat')).not.toBeNull();
        expect(trie.findNode('bat')?.children.size).toBe(0);

        expect(trie.findNode('ba')).not.toBeNull();
        expect(trie.findNode('ball')).not.toBeNull();
        
    });
})

describe('NodeMaterial', () => {
    let trie: Trie;
    let objectA: ContentObject;

    class ContentObject {
        content: string;
        constructor(content: string) {
            this.content = content;
        }
    }
    
    beforeEach(() => {
        trie = new Trie();
        objectA = new ContentObject('a');
    });

    // Adding Duplicates
    test('Adding duplicate strings - root nodes', () => {
        trie.addNode('c', new NodeMaterial(objectA));
        trie.addNode('c', new NodeMaterial(objectA));
        trie.addNode('c', new NodeMaterial(objectA));
        
        // root node is not supposed to hold material.
        expect(trie.findNode('c')!.materials.length).toBe(0);
    });
    test('Adding duplicate strings - non root nodes', () => {
        trie.addNode('cat', new NodeMaterial(objectA));
        trie.addNode('cat', new NodeMaterial(objectA));
        trie.addNode('cat', new NodeMaterial(objectA));
        
        expect(trie.findNode('cat')!.materials.length).toBe(1);
    });
});

describe('NodeMaterial and Suggestion', () => {
    let trie: Trie;
    let objectA: ContentObject;
    let objectB: ContentObject;
    let objectC: ContentObject;
    let materialA: NodeMaterial;
    let materialB: NodeMaterial;
    let materialC: NodeMaterial;

    const prefix: string = 'node_'

    class ContentObject {
        content: string;
        constructor(content: string) {
            this.content = content;
        }
    }

    beforeEach(() => {
        trie = new Trie();
        
        objectA = new ContentObject('a');
        objectB = new ContentObject('b');
        objectC = new ContentObject('c');

        materialA = new NodeMaterial(objectA);
        materialB = new NodeMaterial(objectB);
        materialC = new NodeMaterial(objectC);

        trie.addNode(`${prefix}a`, materialA);
        trie.addNode(`${prefix}b`, materialB);
        trie.addNode(`${prefix}c`, materialC);
    });

    test('metadata consistency', () => {
        const metadataArray: NodeMaterial[][] = [];
        for (let i = 1; i <= prefix.length; i++) {
            const tmp = trie.findNode(prefix.slice(0, i))?.getSuggestedMaterials();
            // is this good practice?
            expect(tmp).toBeDefined();
            metadataArray.push(trie.findNode(prefix.slice(0, i))!.getSuggestedMaterials());
        }

        function checkArrayConsistency(metadataArray: NodeMaterial[][]): boolean {
            if (metadataArray.length == 0 || metadataArray[0].length == 0) return false;
            const reference = metadataArray[0];
            for (let i = 1; i < metadataArray.length; i++) {
                if (metadataArray[i].length !== reference.length) return false;
                for (let j = 0; j < reference.length; j++) {
                    if (!metadataArray[i][j].equal(reference[j])) return false;
                }
            }
            return true;
        }

        expect(checkArrayConsistency(metadataArray)).toBe(true);
    });

    test('metadata validity', () => {
        const nodeA = trie.findNode(`${prefix}a`)!;
        const nodeB = trie.findNode(`${prefix}b`)!;
        const nodeC = trie.findNode(`${prefix}c`)!;

        for (let i = 0; i < 5; i++) nodeA.getMaterials()!.forEach(m => m.readContent());
        for (let i = 0; i < 3; i++) nodeB.getMaterials()!.forEach(m => m.readContent());
        for (let i = 0; i < 1; i++) nodeC.getMaterials()!.forEach(m => m.readContent());
        
        // [objectA, objectB, objectC] 
        const metadata = trie.suggestNodeMaterials(prefix);

        expect(metadata.length).toBe(3);
        expect(metadata[0]!).toEqual(materialA);
        expect(metadata[1]!).toEqual(materialB);
        expect(metadata[2]!).toEqual(materialC);
    });
});