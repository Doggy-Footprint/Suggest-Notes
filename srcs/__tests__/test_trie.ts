import { PrefixTree, Node, Content } from "../trie";

const generalTestSet: string[] = [
    'apple', 'apricot', 'apartment', 'apply', 'approach',
    'banana', 'band', 'banner', 'bank', 'barrel',
    'cat', 'catalog', 'catch', 'category', 'cater',
    'dog', 'door', 'dorm', 'dot', 'double',
    'elephant', 'elevator', 'eleven', 'elite', 'email', 'embrace', 'emerge', 
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
    'xylophone', 'xenon', 'xerox', 'x-ray',
    'yak', 'yard', 'yarn', 'year', 'yellow',
]

/**
 * Check if two arrays are exactly equal or all of their elements are.
 * @param a 
 * @param b 
 * @returns 
 */
function isSameArray(a: any[], b: any[]): boolean {
    // check reference
    if (a === b) return true;
    // check length
    if (a.length !== b.length) return false;

    const diff = a.some((ae, i) => ae !== b[i]);

    return !diff;
}

/**
 * Check suggestion with an array of values(V).
 * @param a 
 * @param values 
 * @returns 
 */
function checkSuggestion<V>(a: Content<V>[], values: V[]): boolean {
    if (a.length !== values.length) return false;
    
    for (let i = 0; i < a.length; i++) {
        if (a[i].read(false) !== values[i]) return false;
    }

    return true;
}

describe('PrefixTree basic operations - add, search', () => {
    const test_set_not_included: string[] = [
        'dapple', 'hatered', 'double monitor', 'july'
    ];

    let trie: PrefixTree<string>;

    beforeAll(() => {
        trie = new PrefixTree();
        generalTestSet.forEach(c => trie.add(c));
    });

    test('search exisitng nodes', () => {
        for (const word of generalTestSet) {
            expect(trie.search(word)).toBeDefined();
        }
    });

    test('search non-existing nodes', () => {
        for (const word of test_set_not_included) {
            expect(trie.search(word)).not.toBeDefined();
        }
    })

    test('search for edge cases', () => {
        // emtpy string
        expect(trie.search('')).not.toBeDefined();

        // root string - which does exist
        expect(trie.search('y')).toBeDefined();

        // root string - which does not exist
        expect(trie.search('z')).not.toBeDefined(); // no 'z-' starting element in test_set.

        // an existing node + extra char
        expect(trie.search('yellow')).toBeDefined();
        expect(trie.search('yellows')).not.toBeDefined();
        
        // case ignoring
        expect(trie.search('aBcDe')).not.toBeDefined();
        trie.add('abcde');
        expect(trie.search('aBcDe')).toBeDefined();

        // triming both side
        expect(trie.search('korea')).not.toBeDefined();
        trie.add(' korea');
        trie.add('korea ');
        trie.add(' korea ');
        expect(trie.search('korea')).not.toBeDefined();
        expect(trie.search(' korea')).not.toBeDefined();
        expect(trie.search('korea ')).not.toBeDefined();
        expect(trie.search(' korea ')).not.toBeDefined();
        // need for other space?: tab? etc.
    });
});

describe('PrefixTree with Content - add and search operations', () => {
    let trie: PrefixTree<string>;

    beforeEach(() => {
        trie = new PrefixTree();
        generalTestSet.forEach(c => trie.add(c, new Content<string>(c)));
    })

    test('Search words', () => {
        for (const word of generalTestSet) {
            const node = trie.search(word);
            expect(node).toBeDefined();
            const content = node!.getContents();
            expect(content.length).toBe(1);
            expect(content[0].read()).toBe(word);
        }
    });
});

describe('PrefixTree with Content', () => {
    let trie: PrefixTree<string>;

    beforeEach(() => {
        trie = new PrefixTree();
        generalTestSet
            .filter(c => c.startsWith('e'))
            .forEach(c => trie.add(c, new Content<string>(c)));
    })

    /**
     * Prefix Tree of this test.
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
            node?: Node<string>;
        }

        const testingParameters: Test_Parameter[] = [
            { word: 'elephant', count: 1},
            { word: 'elevator', count: 2},
            { word: 'eleven', count: 3},
            { word: 'elite', count: 4},
            { word: 'email', count: 5},
            { word: 'embrace', count: 6},
            { word: 'emerge', count: 7}
        ];

        // update metadata
        for (const param of testingParameters) {
            const node = trie.search(param.word);
            expect(node).toBeDefined();
            expect(node?.getContents().length).toBe(1);
            param.node = node!;
            for (let i = 0; i < param.count; i++) {
                // getContents()[0] is tested in 'Search words'
                param.node.getContents()[0]!.read();
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
        expect(checkSuggestion(elev_Suggestion, ['eleven', 'elevator'])).toBeTruthy();

        expect(ele_Suggestion.length).toBe(3);
        expect(checkSuggestion(ele_Suggestion, ['eleven', 'elevator', 'elephant'])).toBeTruthy();

        expect(el_Suggestion.length).toBe(4);
        expect(checkSuggestion(el_Suggestion, ['elite', 'eleven', 'elevator', 'elephant'])).toBeTruthy();

        expect(em_Suggestion.length).toBe(3);
        expect(checkSuggestion(em_Suggestion, ['emerge', 'embrace', 'email'])).toBeTruthy();

        expect(e_Suggestion.length).toBe(7);
        expect(checkSuggestion(e_Suggestion, ['emerge', 'embrace', 'email', 'elite', 'eleven', 'elevator', 'elephant'])).toBeTruthy();
    });
});

describe('A Content object in muliple Node objects', () => {
    let trie: PrefixTree<string>;
    const trieLeaves = [
        'abdi', 'abdjk', 'abdjl', 'abe', 'acf', 'acg', 'ach'
    ]

    interface TestParameter {
        content: string,
        keywords: string[],
        readCount: number,
        contentObj: Content<string>
    }
    
    const testSet: Map<string, TestParameter> = new Map();

    testSet.set('chicken', {
        content: 'chicken', 
        keywords: ['abdi', 'abe', 'acf', 'ach'],
        readCount: 10,
        contentObj: new Content<string>('chicken')
    });
    testSet.set('watch', {
        content: 'watch',
        keywords: ['ab', 'acg'],
        readCount: 5,
        contentObj: new Content<string>('watch')
    });
    testSet.set('dog', {
        content: 'dog', 
        keywords: ['ab', 'abd', 'abe', 'acf'],
        readCount: 1,
        contentObj: new Content<string>('dog')
    });

    /**
    * a
    * ├── b - ab - dog, watch
    * │   ├── d - abd - dog
    * │   │   ├── i - abdi - chicken
    * │   │   └── j - abdj - abdj
    * │   │       ├── k - abdjk - abdjk
    * │   │       └── l - abdjl - abdjl
    * │   └── e - abe - chicken, dog
    * └── c - ac
    *     ├── f - acf - chicken, dog
    *     ├── g - acg - watch
    *     └── h - ach - chicken
    */
    beforeEach(() => {
        trie = new PrefixTree();
        for (const leaf of trieLeaves) {
            trie.add(leaf);
        }
        for(const testCase of testSet.values()) {
            for (const keyword of testCase.keywords) {
                const node = trie.search(keyword)!;
                node.addContent(testCase.contentObj, keyword, true);
            }
            for (let i = 0; i < testCase.readCount; i++) {
                testCase.contentObj.read(true);
            }
        }
    });

    test('Suggestion validity and consistency', () => {
        // variable names use '_' for readability
        const a_Suggestion = trie.search('a')!.getSuggestion();
        const ab_Suggestion = trie.search('ab')!.getSuggestion();
        const abd_Suggestion = trie.search('abd')!.getSuggestion();
        const abdi_Suggestion = trie.search('abdi')!.getSuggestion();
        const abdj_Suggestion = trie.search('abdj')!.getSuggestion();
        const abe_Suggestion = trie.search('abe')!.getSuggestion();
        const ac_Suggestion = trie.search('ac')!.getSuggestion();

        // suggestion order: chicken (10) -> watch (5) -> dog (1)
        expect(checkSuggestion(a_Suggestion, ['chicken', 'watch', 'dog'])).toBeTruthy();

        expect(isSameArray(ab_Suggestion, a_Suggestion)).toBeTruthy();

        expect(checkSuggestion(abd_Suggestion, ['chicken', 'dog'])).toBeTruthy();

        expect(checkSuggestion(abdi_Suggestion, ['chicken'])).toBeTruthy();

        expect(abdj_Suggestion.length).toBe(0);

        expect(checkSuggestion(abe_Suggestion, ['chicken', 'dog'])).toBeTruthy();

        expect(checkSuggestion(ac_Suggestion, ['chicken', 'watch', 'dog'])).toBeTruthy();
    });

    test('Keywords of Content objects - check inclusion', () => {
        const chicken = testSet.get('chicken')!.contentObj;
        expect(isSameArray(chicken.getKeywords('ab').map(k => k.keyword), ['abdi', 'abe'])).toBeTruthy();
        expect(isSameArray(chicken.getKeywords('ac').map(k => k.keyword), ['acf', 'ach'])).toBeTruthy();
        
        {
            chicken.readWithKeyword('abdi');
            chicken.readWithKeyword('abdi');
            chicken.readWithKeyword('abe');
        }

        // abdi:2, abe: 1
        expect(chicken.getKeywords('ab').map(k => k.keyword)).toEqual(['abdi', 'abe']);

        {
            chicken.readWithKeyword('abe');
            chicken.readWithKeyword('abe');
        }

        // abe: 3, abdi: 2
        expect(chicken.getKeywords('ab').map(k => k.keyword)).toEqual(['abe', 'abdi']);

        const watch = testSet.get('watch')!.contentObj;
        expect(isSameArray(watch.getKeywords('ab').map(k => k.keyword), ['ab'])).toBeTruthy();
        expect(isSameArray(watch.getKeywords('ac').map(k => k.keyword), ['acg'])).toBeTruthy();

        {
            watch.readWithKeyword('ab');
            watch.readWithKeyword('ab');
            watch.readWithKeyword('acg');
        }
        
        // ab: 2, acg: 1
        expect(watch.getKeywords('a').map(k => k.keyword)).toEqual(['ab', 'acg']);

        {
            watch.readWithKeyword('acg'); 
            watch.readWithKeyword('acg');
        }

        // acg: 3, ab: 2
        expect(watch.getKeywords('a').map(k => k.keyword)).toEqual(['acg', 'ab']);

        const dog = testSet.get('dog')!.contentObj;
        expect(isSameArray(dog.getKeywords('ab').map(k => k.keyword), ['ab', 'abd', 'abe'])).toBeTruthy();
        expect(isSameArray(dog.getKeywords('ac').map(k => k.keyword), ['acf'])).toBeTruthy();

        {
            dog.readWithKeyword('abd');
            dog.readWithKeyword('abd');
            dog.readWithKeyword('abd');
            dog.readWithKeyword('abe');
            dog.readWithKeyword('abe');
            dog.readWithKeyword('ab');
        }

        // abd: 3, abe: 2, ab: 1
        expect(dog.getKeywords('ab').map(k => k.keyword)).toEqual(['abd', 'abe', 'ab']);

        {
            dog.readWithKeyword('ab');
            dog.readWithKeyword('ab');
            dog.readWithKeyword('ab');
            dog.readWithKeyword('ab');
            dog.readWithKeyword('abd');
            dog.readWithKeyword('abe');
        }

        // ab: 5, abd: 4, abe: 3
        expect(dog.getKeywords('ab').map(k => k.keyword)).toEqual(['ab', 'abd', 'abe']);
    });

    test('delete Content 1: delete chicken from ach - check deletion, suggestion not updated because of other keywords', () => {
        // variable names use '_' for readability

        const ac_Suggestion_before = trie.search('ac')!.getSuggestion().slice();

        trie.delete('ach', testSet.get('chicken')!.content);
        
        // no content in 'ach'
        expect(trie.search('ach')!.getContents().length).toBe(0);

        // suggestions are not changed in 'ac', and 'a'.
        const ac_Suggestion_after = trie.search('ac')!.getSuggestion(); // TODO: write auxilary function to compare before, after
        expect(isSameArray(ac_Suggestion_before, ac_Suggestion_after)).toBeTruthy();
        const a_Suggestion_after = trie.search('a')!.getSuggestion();
        expect(isSameArray(a_Suggestion_after, ac_Suggestion_after)).toBeTruthy();
    });

    test('delete Content 2: delete watch from acg - propagation of deletion, preservation of unrelated node', () => {
        // variable names use '_' for readability

        const ac_Suggestion_before = trie.search('ac')!.getSuggestion().slice();
        
        trie.delete('acg', testSet.get('watch')!.content);
        
        // no content in 'acg'
        expect(trie.search('acg')!.getContents().length).toBe(0);
        
        // suggestion is changed in 'ac'
        const ac_Suggestion_after = trie.search('ac')!.getSuggestion();
        expect(isSameArray(ac_Suggestion_before, ac_Suggestion_after)).toBeFalsy();

        // suggestion is not changed in 'acf' - unrelated node.
        const acf_Suggestion = trie.search('acf')!.getSuggestion();
        expect(isSameArray(ac_Suggestion_after, acf_Suggestion)).toBeTruthy();
    });

    test('delete Content 3: delete chicken from abdi - integration of deletion test 1, 2', () => {
        // variable names use '_' for readability

        const abd_Suggestion_before = trie.search('abd')!.getSuggestion().slice();
        const ab_Suggestion_before = trie.search('ab')!.getSuggestion().slice();

        trie.delete('abdi', testSet.get('chicken')!.content);

        // expect suggestion to be changed in abd and not in ab
        const abd_Suggestion_after = trie.search('abd')!.getSuggestion();
        expect(isSameArray(abd_Suggestion_before, abd_Suggestion_after)).toBeFalsy();
        const ab_Suggestion_after = trie.search('ab')!.getSuggestion();
        expect(isSameArray(ab_Suggestion_before, ab_Suggestion_after)).toBeTruthy();
    });

    test('delete Content 4: same with delete Content 3, but with cases - when Content object has same keyword with difference case', () => {
        // variable names use '_' for readability

        // add 'aBdI' keyword to chicken
        const newKeyword = 'aBdI';

        const chicken = testSet.get('chicken')!.contentObj;
        chicken.addKeyword(newKeyword);

        const abdi_Suggestion_before = trie.search('abdi')!.getSuggestion().slice();
        const abd_Suggestion_before = trie.search('abd')!.getSuggestion().slice();
        const ab_Suggestion_before = trie.search('ab')!.getSuggestion().slice();

        trie.delete(newKeyword, testSet.get('chicken')!.content);

        // expect no changes in suggestion because 'aBdI' is deleted not previously existing 'abdi'
        const abdi_Suggestion_after = trie.search('abdi')!.getSuggestion();
        expect(isSameArray(abdi_Suggestion_before, abdi_Suggestion_after)).toBeTruthy();
        const abd_Suggestion_after = trie.search('abd')!.getSuggestion();
        expect(isSameArray(abd_Suggestion_before, abd_Suggestion_after)).toBeTruthy();
        const ab_Suggestion_after = trie.search('ab')!.getSuggestion();
        expect(isSameArray(ab_Suggestion_before, ab_Suggestion_after)).toBeTruthy();
    });
    
    test('move Content 1: move chicken from ach to acg - Basic move test', () => {
        // variable names use '_' for readability

        trie.move('ach', 'acg', testSet.get('chicken')!.content);

        expect(trie.search('ach')!.getSuggestion().length).toBe(0);
        expect(trie.search('ach')!.getContents().length).toBe(0);
        expect(trie.search('acg')!.getSuggestion().map(s => s.read(false))).toEqual(['chicken','watch']); // TODO refactor
        expect(trie.search('acg')!.getContents().map(s => s.read(false)).sort()).toEqual(['chicken', 'watch']);
    });

    test('move Content 2: move chicken from ach to acf - move to a node which already has the Content object', () => {
        // variable names use '_' for readability

        const acf_Suggestion_before = trie.search('acf')!.getSuggestion().slice();
        trie.move('ach', 'acf', testSet.get('chicken')!.content);
        expect(trie.search('ach')!.getSuggestion().length).toBe(0);
        expect(trie.search('ach')!.getContents().length).toBe(0);
        expect(trie.search('acf')!.getContents().length).toBe(2);

        const acf_Suggestion_after = trie.search('acf')!.getSuggestion();
        expect(isSameArray(acf_Suggestion_before, acf_Suggestion_after)).toBeTruthy();
    });

    test('move Content 3: move dog from abd to abdjk - Suggestion validity after move', () => {
        // variable names use '_' for readability

        const ab_Suggestion_before = trie.search('ab')!.getSuggestion().slice();
        const abd_Suggestion_before = trie.search('abd')!.getSuggestion().slice();
        trie.move('abd', 'abdjk', testSet.get('dog')!. content);

        const ab_Suggestion_after = trie.search('ab')!.getSuggestion();
        const abd_Suggestion_after = trie.search('abd')!.getSuggestion();
        expect(isSameArray(ab_Suggestion_before, ab_Suggestion_after)).toBeTruthy();
        expect(isSameArray(abd_Suggestion_before, abd_Suggestion_after)).toBeTruthy();
        expect(trie.search('abdj')!.getSuggestion().map(c => c.read(false))).toEqual(['dog']);
        expect(trie.search('abdjk')!.getSuggestion().map(c => c.read(false))).toEqual(['dog']);
    });

    // TODO: test more edge cases

    test('cleanUp Content', () => {
        const dog = testSet.get('dog')!.contentObj;
        dog.cleanUp();

        for (const query of testSet.get('dog')!.keywords) {
            expect(trie.search(query)!.getContents().some(c => c === dog)).toBeFalsy();
        }
    })
});