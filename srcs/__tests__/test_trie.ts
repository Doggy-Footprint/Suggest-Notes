import { PrefixTree, Node, Content } from "../trie";

// TODO use snake convention for variables for readability

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

class TestingContent {
    value: string;

    constructor(word: string) {
        this.value = word;
    }

    public getWord(): string {
        return this.value;
    }
}

function checkSuggestionEquality<V>(a: Content<V>[], b: Content<V>[]): boolean {
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

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

        // root string - which does not exist
        expect(trie.search('z')).not.toBeDefined(); // no 'z-' starting element in test_set.

        // a existing node + extra char
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
    let trie: PrefixTree<TestingContent>;

    beforeEach(() => {
        trie = new PrefixTree();
        generalTestSet.forEach(c => trie.add(c, new Content<TestingContent>(new TestingContent(c))));
    })

    test('Search words', () => {
        for (const word of generalTestSet) {
            const node = trie.search(word);
            expect(node).toBeDefined();
            const content = node!.getContents();
            expect(content.length).toBe(1);
            expect(content[0].read().getWord()).toBe(word);
        }
    });
});

describe('PrefixTree with Content', () => {
    let trie: PrefixTree<TestingContent>;

    beforeEach(() => {
        trie = new PrefixTree();
        generalTestSet
            .filter(c => c.startsWith('e'))
            .forEach(c => trie.add(c, new Content<TestingContent>(new TestingContent(c))));
    })

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
            node?: Node<TestingContent>;
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
        

        // TODO - refactor this to use a auxiliary function
        expect(elev_Suggestion.length).toBe(2);
        expect(elev_Suggestion[0].read(false).getWord()).toBe('eleven');
        expect(elev_Suggestion[1].read(false).getWord()).toBe('elevator');

        expect(ele_Suggestion.length).toBe(3);
        expect(ele_Suggestion[0].read(false).getWord()).toBe('eleven');
        expect(ele_Suggestion[1].read(false).getWord()).toBe('elevator');
        expect(ele_Suggestion[2].read(false).getWord()).toBe('elephant');

        expect(el_Suggestion.length).toBe(4);
        expect(el_Suggestion[0].read(false).getWord()).toBe('elite');
        expect(el_Suggestion[1].read(false).getWord()).toBe('eleven');
        expect(el_Suggestion[2].read(false).getWord()).toBe('elevator');
        expect(el_Suggestion[3].read(false).getWord()).toBe('elephant');

        expect(em_Suggestion.length).toBe(3);
        expect(em_Suggestion[0].read(false).getWord()).toBe('emerge');
        expect(em_Suggestion[1].read(false).getWord()).toBe('embrace');
        expect(em_Suggestion[2].read(false).getWord()).toBe('email');

        expect(e_Suggestion.length).toBe(7);
        expect(e_Suggestion[0].read(false).getWord()).toBe('emerge');
        expect(e_Suggestion[1].read(false).getWord()).toBe('embrace');
        expect(e_Suggestion[2].read(false).getWord()).toBe('email');
        expect(e_Suggestion[3].read(false).getWord()).toBe('elite');
        expect(e_Suggestion[4].read(false).getWord()).toBe('eleven');
        expect(e_Suggestion[5].read(false).getWord()).toBe('elevator');
        expect(e_Suggestion[6].read(false).getWord()).toBe('elephant');
    });
});

/**
 * a
 * ├── b - ab (not leaf)
 * │   ├── d - abd (not leaf)
 * │   │   ├── i - abdi
 * │   │   └── j - abdj (not leaf)
 * │   │       ├── k - abdjk
 * │   │       └── l - abdjl
 * │   └── e - abe
 * └── c - ac(not leaf)
 *     ├── f - acf
 *     ├── g - acg
 *     └── h - ach
 */


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

        expect(checkSuggestionEquality(ab_Suggestion, a_Suggestion)).toBeTruthy();

        expect(checkSuggestion(abd_Suggestion, ['chicken', 'dog'])).toBeTruthy();

        expect(checkSuggestion(abdi_Suggestion, ['chicken'])).toBeTruthy();

        expect(abdj_Suggestion.length).toBe(0);

        expect(checkSuggestion(abe_Suggestion, ['chicken', 'dog'])).toBeTruthy();

        expect(checkSuggestion(ac_Suggestion, ['chicken', 'watch', 'dog'])).toBeTruthy();
    });

    // TODO refactor or document
    test('Keywords of Content objects - check inclusion', () => {
        function haveSameElements(a: any[], b: any[]): boolean {
            if (a.length !== b.length) return false;
            const diff = a.some((ae, i) => ae !== b[i]);

            return !diff;
        }
        
        // chicken
        const chicken = testSet.get('chicken')!.contentObj;
        expect(haveSameElements(chicken.getKeywords('ab').map(k => k.keyword), ['abdi', 'abe'])).toBeTruthy();
        expect(haveSameElements(chicken.getKeywords('ac').map(k => k.keyword), ['acf', 'ach'])).toBeTruthy();
        
        {
            chicken.updateKeywords('abdi');
            chicken.updateKeywords('abdi');
            chicken.updateKeywords('abe');
        }

        // abdi:2, abe: 1
        expect(chicken.getKeywords('ab').map(k => k.keyword)).toEqual(['abdi', 'abe']);

        {
            chicken.updateKeywords('abe');
            chicken.updateKeywords('abe');
        }

        // abe: 3, abdi: 2
        expect(chicken.getKeywords('ab').map(k => k.keyword)).toEqual(['abe', 'abdi']);

        // watch
        const watch = testSet.get('watch')!.contentObj;
        expect(haveSameElements(watch.getKeywords('ab').map(k => k.keyword), ['ab'])).toBeTruthy();
        expect(haveSameElements(watch.getKeywords('ac').map(k => k.keyword), ['acg'])).toBeTruthy();

        {
            watch.updateKeywords('ab');
            watch.updateKeywords('ab');
            watch.updateKeywords('acg');
        }
        
        // ab: 2, acg: 1
        expect(watch.getKeywords('a').map(k => k.keyword)).toEqual(['ab', 'acg']);

        {
            watch.updateKeywords('acg'); 
            watch.updateKeywords('acg');
        }

        // acg: 3, ab: 2
        expect(watch.getKeywords('a').map(k => k.keyword)).toEqual(['acg', 'ab']);

        // dog
        const dog = testSet.get('dog')!.contentObj;
        expect(haveSameElements(dog.getKeywords('ab').map(k => k.keyword), ['ab', 'abd', 'abe'])).toBeTruthy();
        expect(haveSameElements(dog.getKeywords('ac').map(k => k.keyword), ['acf'])).toBeTruthy();

        {
            dog.updateKeywords('abd');
            dog.updateKeywords('abd');
            dog.updateKeywords('abd');
            dog.updateKeywords('abe');
            dog.updateKeywords('abe');
            dog.updateKeywords('ab');
        }

        // abd: 3, abe: 2, ab: 1
        expect(dog.getKeywords('ab').map(k => k.keyword)).toEqual(['abd', 'abe', 'ab']);

        {
            dog.updateKeywords('ab');
            dog.updateKeywords('ab');
            dog.updateKeywords('ab');
            dog.updateKeywords('ab');
            dog.updateKeywords('abd');
            dog.updateKeywords('abe');
        }

        // ab: 5, abd: 4, abe: 3
        expect(dog.getKeywords('ab').map(k => k.keyword)).toEqual(['ab', 'abd', 'abe']);
    });

    test('delete Content 1: delete chicken from ach', () => {
        const ac_Suggestion_before = trie.search('ac')!.getSuggestion();
        trie.delete(testSet.get('chicken')!.content, 'ach');
        expect(trie.search('ach')!.getContents().length).toBe(0);
        const ac_Suggestion_after = trie.search('ac')!.getSuggestion();
        expect(checkSuggestionEquality(ac_Suggestion_before, ac_Suggestion_after)).toBeTruthy();
        const a_Suggestion_after = trie.search('a')!.getSuggestion();
        expect(checkSuggestionEquality(a_Suggestion_after, ac_Suggestion_after)).toBeTruthy();
    });

    test('delete Content 2: delete watch from acg', () => {
        const ac_Suggestion_before = trie.search('ac')!.getSuggestion();
        trie.delete(testSet.get('watch')!.content, 'acg');
        expect(trie.search('acg')!.getContents().length).toBe(0);
        const ac_Suggestion_after = trie.search('ac')!.getSuggestion();
        expect(checkSuggestionEquality(ac_Suggestion_before, ac_Suggestion_after)).not.toBeTruthy();
        const acf_Suggestion = trie.search('acf')!.getSuggestion();
        expect(checkSuggestionEquality(ac_Suggestion_after, acf_Suggestion)).toBeTruthy();
    });

    test('delete Content 3: delete chicken from abdi', () => {
        // expect suggestion to be changed in abd and not in ab
        
        const abd_Suggestion_before = trie.search('abd')!.getSuggestion();
        const ab_Suggestion_before = trie.search('ab')!.getSuggestion();
        trie.delete(testSet.get('chicken')!.content, 'abdi');
        const abd_Suggestion_after = trie.search('abd')!.getSuggestion();
        const ab_Suggestion_after = trie.search('ab')!.getSuggestion();

        expect(checkSuggestionEquality(abd_Suggestion_before, abd_Suggestion_after)).not.toBeTruthy();
        expect(checkSuggestionEquality(ab_Suggestion_before, ab_Suggestion_after)).toBeTruthy();
    });

    // TODO: same deletion test with cases

    test('move Content 1: move chicken from ach to acg', () => {
        trie.move(testSet.get('chicken')!.content, 'ach', 'acg');

        expect(trie.search('ach')!.getSuggestion().length).toBe(0);
        expect(trie.search('acg')!.getSuggestion().map(s => s.read(false))).toEqual(['chicken','watch'])
    });

    test('move Content 2: move chicken from ach to acf', () => {
        const acf_Suggestion_before = trie.search('acf')!.getSuggestion();
        trie.move(testSet.get('chicken')!.content, 'ach', 'acf');
        expect(trie.search('ach')!.getSuggestion().length).toBe(0);

        const acf_Suggestion_after = trie.search('acf')!.getSuggestion();
        expect(checkSuggestionEquality(acf_Suggestion_before, acf_Suggestion_after)).toBeTruthy();
    });

    test('move Content 3: move dog from abd to abdjk', () => {
        // check suggestion validity after move

        const abd_Suggestion_before = trie.search('abd')!.getSuggestion();
        trie.move(testSet.get('dog')!. content, 'abd', 'abdjk');

        const abd_Suggestion_after = trie.search('abd')!.getSuggestion();
        expect(checkSuggestionEquality(abd_Suggestion_before, abd_Suggestion_after)).toBeTruthy();
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