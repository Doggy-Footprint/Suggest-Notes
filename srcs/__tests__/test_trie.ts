import { PrefixTree, Node } from "../trie";

describe('PrefixTree basic operations', () => {
    let trie: PrefixTree;
    const test_set: string[] = [
        'apple', 'apricot', 'apartment', 'apply', 'approach',
        'banana', 'band', 'banner', 'bank', 'barrel',
        'cat', 'catalog', 'catch', 'category', 'cater',
        'dog', 'door', 'dorm', 'dot', 'double',
        'elephant', 'elevator', 'eleven', 'elite', 'email',
        'fish', 'fist', 'fiscal', 'fit', 'fiction',
        'goat', 'goal', 'golf', 'gone', 'good',
        'hat', 'hate', 'hatch', 'happy', 'harden',
        'ice', 'icon', 'idle', 'ideal', 'ignite',
        'jacket', 'jail', 'jam', 'jazz', 'jewel',
        'kangaroo', 'kettle', 'kept', 'key', 'king',
        'lamp', 'land', 'lane', 'large', 'laser',
        'monkey', 'monitor', 'month', 'moody', 'motor',
        'note', 'noble', 'node', 'noise', 'north',
        'orange', 'orbit', 'organ', 'origin', 'ornament',
        'panda', 'panic', 'panel', 'pant', 'park',
        'queen', 'quick', 'quit', 'quilt', 'quote',
        'rabbit', 'race', 'rack', 'radio', 'range',
        'snake', 'snap', 'snow', 'soap', 'soft',
        'tiger', 'tight', 'tire', 'title', 'toast',
        'umbrella', 'unicorn', 'unit', 'unique', 'user',
        'violet', 'vital', 'voice', 'void', 'volcano',
        'water', 'waste', 'wave', 'wax', 'web',
        'xylophone', 'xenon', 'xerox', 'x-ray', 'xenon',
        'yak', 'yard', 'yarn', 'year', 'yellow',
    ]
    const test_set_not_included: string[] = [
        'dapple', 'hatered', 'double monitor', 'july'
    ]

    beforeAll(() => {
        trie = new PrefixTree();
        for (const word of test_set) trie.add(word);
    })

    test('search exisitng nodes', () => {
        for (const word of test_set) {
            expect(trie.search(word)).toBeDefined();
        }
    });

    test('search non-existing nodes', () => {
        for (const word of test_set_not_included) {
            expect(trie.search(word)).not.toBeDefined();
        }
    })

    test('search for edge cases', () => {
        expect(trie.search('')).not.toBeDefined();
        expect(trie.search('z')).not.toBeDefined(); // no 'z-' starting element in test_set.
        expect(trie.search('yellows')).not.toBeDefined();
    });
});