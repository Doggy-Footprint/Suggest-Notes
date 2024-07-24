# Front
- [ ] make it pretty
- [ ] decide whether to limit the number of suggestions or not

# Feature
- [ ] Save & restore Note/Keyword usage including latest use
    - [ ] profile again afterward
        - working
            - [ ] make a denoting class which is responsible for evaluate 'score' of 
            Content and Keyword class, use default one in trie.ts.
                - this is for letting main.ts to override without extending it
                - [x] isolate Statistic class
            - [ ] save / restoring static class with useCount, lastUsed
            - [ ] serialize Content, Keyword based on the path. use HashTable when loading it on memory.
                - No entire save/restore operation assumed
            - [ ] Be careful on addFileinTrie, addAliasinTrie and its usages.
    - [ ] statistics
        - [x] Separate Statistic for Content and Keyword (former: metadata, latter: rendering)
            - [x] Maybe need to define getInstance() (not singleton) for Statistic and keep it in Plugin as initializer of 
                  Statistic for Content and Keyword
        - [ ] add more statistics for scenarios
        
- [ ] update LinkSuggest.getSuggestions to sort with latest use
    - expect to be done by above TODO
- [ ] Store abbreviation also for keywords including spaces
    - eg. "Keyword Based Note Suggestion" can be searched with "kbns"

# Refactor
- [ ] get start to separate modules in trie
- [ ] Consider if Content and Keyword need to keep their own each Statistic

# Optimization
- [ ] make SortedArray to use compare instead of checkInsertIndexFn

# Optimization for later demands
- [ ] limit Node.suggestions size so that propation can be suspended properly

# TEST
- [ ] refactor helper functions so that problems can be shown in result
    - current helper functions show only ture/false matches for some tests