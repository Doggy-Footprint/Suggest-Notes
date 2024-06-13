# Concern: Separation of business logic for TDD sake

For current Design, keywords data structure is TRIE which can be searched by character by character of a word.

And additionally each node of TRIE might include metadata such as defined in 
**#### Each node includes ** part of Design.md.

But for sake of convinient if Obsidian Plugin, It would be greatly reduce works if we can store TFile object for each node. 

## A testing Idea

write Testable TRIE and Node classes and inherit these classes to include Obisidian specific objects.

For example, make Node and Keywords class without Obsidian and create two subclasses ObsidianNode and ObsidianKeywords which depends on Obsidian API and extends Node and Keywords

```ts
interface ObsidianDependants {
    name: string;
}

class Node_TEST {
    letter: string
    children: Node_TEST[]
}

class Keywords_TEST {
    root: Node_TEST

    constructor(root: Node_TEST) {
        this.root = root;
    }

    addKeyword() {}
    updateKeyword() {}
}

class CustomNode_TEST extends Node_TEST {
    addtitional: ObsidianDependants | null
}

class CustomKeywords_TEST extends Keywords_TEST {
    constructor(root: CustomNode_TEST) {
        super(root);
        this.root = root;
    }
}
```