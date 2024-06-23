# Concern: Separation of business logic for TDD sake

For current Design, keywords data structure is TRIE which can be searched by character by character of a word.

And additionally each node of TRIE might include metadata such as defined in 
**#### Each node includes ** part of Design.md.

But for sake of convinient if Obsidian Plugin, It would be greatly reduce works if we can store TFile object for each node. 

# IDEA

Separate srcs to **obsidian_srcs** and **srcs**. Core business logic like trie and search engine will be implemented in **srcs** and any obsidian platform dependency is excluded from **srcs**. By eliminating obsidian platform dependency, **srcs** can be tested via **jest**.

# TDD

- follow red green refactor. 
- Test Trie without NodeMetadata or NodeMaterial
- Test NodeMetadata NodeMaterial together