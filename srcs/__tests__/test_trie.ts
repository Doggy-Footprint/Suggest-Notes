import * as exp from 'constants';
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
        trie.addNode(`${prefix}b`, materialA);
        trie.addNode(`${prefix}c`, materialA);
    });

    test('metadata consistency', () => {
        const metadataArray: NodeMaterial[][] = [];
        for (let i = 1; i <= prefix.length; i++) {
            const tmp = trie.findNode(prefix.slice(0, i))?.getMetadata();
            // is this good practice?
            expect(tmp).toBeDefined();
            metadataArray.push(trie.findNode(prefix.slice(0, i))!.getMetadata());
        }

        // TODO
        function checkSameNonEmptyArrays(metadataArray: NodeMaterial[][]): boolean {
            return false;
        }

        expect(checkSameNonEmptyArrays(metadataArray)).toBe(true);
    });
});