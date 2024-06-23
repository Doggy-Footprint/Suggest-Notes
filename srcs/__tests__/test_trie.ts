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
        expect(trie.findNode('ba')).not.toBeNull();
        expect(trie.findNode('ball')).not.toBeNull();
    });

    // Adding Duplicates
    test('Adding duplicate strings - root nodes', () => {
        trie.addNode('c');
        trie.addNode('c');
    });

    test('Adding duplicate strings - non root nodes', () => {
        trie.addNode('cat');
        trie.addNode('cat');
    });
})

describe('NodeMaterial and NodeMetadata', () => {

});