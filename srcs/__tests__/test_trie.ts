import { PrefixTree, Node, Content, SortedArray } from "../trie";

const testSet: string[] = [
    'apple', 'apricot', 'apartment', 'apply', 'approach',
    'banana', 'band', 'banner', 'bank', 'barrel',
    'cat', 'catalog', 'catch', 'category', 'cater',
    'dog', 'door', 'dorm', 'dot', 'double',
    'elephant', 'elevator', 'eleven', 'elite', 'email', 'embrace', 'Emerge', 
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

describe('PrefixTree basic operations', () => {

    const test_set_not_included: string[] = [
        'dapple', 'hatered', 'double monitor', 'july'
    ]

    let trie: PrefixTree;

    beforeAll(() => {
        trie = new PrefixTree();
        for (const word of testSet) trie.add(word);
    })

    test('search exisitng nodes', () => {
        for (const word of testSet) {
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

describe('PrefixTree with Content add and delete operations with checks for suggestions', () => {
    class Test_ContentObject {
        content: string;

        constructor(content: string) {
            this.content = content;
        }
    }

    let trie: PrefixTree;

    beforeEach(() => {
        trie = new PrefixTree();
        for (const word of testSet) {
            trie.add(word, new Content(new Test_ContentObject(word)));
        }
    })

    test('Search words', () => {
        for (const word of testSet) {
            const node = trie.search(word);
            expect(node).toBeDefined();
            const content = node!.getContents();
            expect(content.length).toBe(1);
            expect(content[0].getContent()).toBe(word);
        }
    });

    /**
     * e*
     * ├── l* 
     * │   ├── e*
     * │   │   ├── phant - elephant(1)
     * │   │   └── v*
     * │   │       ├── ator - elevator(2)
     * │   │       └── en - eleven(3)
     * │   └── ite - elite(4)
     * └── m*
     *     ├── ail - email(5)
     *     ├── brace - embrace(6)
     *     └── erge - emerge(7)
     * (*) denotes common ancestors
     */
    test('Metadata validity & consistency', () => {
        interface Test_Parameter {
            word: string;
            count: number;
            node?: Node;
        }

        const testingParameters: Test_Parameter[] = [
            { word: 'elephant', count: 1},
            { word: 'elevator', count: 2},
            { word: 'eleven', count: 3},
            { word: 'elite', count: 4},
            { word: 'email', count: 5},
            { word: 'embrace', count: 6},
            { word: 'emerge', count: 6}
        ];

        // update metadata
        for (const param of testingParameters) {
            const node = trie.search(param.word);
            expect(node).toBeDefined();
            param.node = node!;
            for (let i = 0; i < param.count; i++) {
                // getContents()[0] is tested in 'Search words'
                param.node.getContents()[0]!.getContent();
            }
        }

        // check suggestion based on metadata
        // variable names use '_' for readability
        const elev_Suggestion = trie.search('elev')!.getSuggestion();
        const ele_Suggestion = trie.search('ele')!.getSuggestion();
        const el_Suggestion = trie.search('el')!.getSuggestion();
        const em_Suggestion = trie.search('em')!.getSuggestion();
        const e_Suggestion = trie.search('e')!.getSuggestion();
        
        expect(elev_Suggestion.length).toBe(2);
        expect(elev_Suggestion[0].getContent()).toBe('eleven');
        expect(elev_Suggestion[1].getContent()).toBe('elevator');

        expect(ele_Suggestion.length).toBe(3);
        expect(ele_Suggestion[0].getContent()).toBe('eleven');
        expect(ele_Suggestion[1].getContent()).toBe('elevator');
        expect(ele_Suggestion[2].getContent()).toBe('elephant');

        expect(el_Suggestion.length).toBe(4);
        expect(el_Suggestion[0].getContent()).toBe('elite');
        expect(el_Suggestion[1].getContent()).toBe('eleven');
        expect(el_Suggestion[2].getContent()).toBe('elevator');
        expect(el_Suggestion[3].getContent()).toBe('elephant');

        expect(em_Suggestion.length).toBe(3);
        expect(em_Suggestion[0].getContent()).toBe('emerge');
        expect(em_Suggestion[1].getContent()).toBe('embrace');
        expect(em_Suggestion[2].getContent()).toBe('email');

        expect(e_Suggestion.length).toBe(7);
        expect(e_Suggestion[0].getContent()).toBe('emerge');
        expect(e_Suggestion[1].getContent()).toBe('embrace');
        expect(e_Suggestion[2].getContent()).toBe('email');
        expect(e_Suggestion[3].getContent()).toBe('elite');
        expect(e_Suggestion[4].getContent()).toBe('eleven');
        expect(e_Suggestion[5].getContent()).toBe('elevator');
        expect(e_Suggestion[6].getContent()).toBe('elephant');
    });
});