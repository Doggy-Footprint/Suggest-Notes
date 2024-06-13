# Keyword Suggesting Plugin's Goal

For given set of notes (user-configured directory, notes with certain tag, etc), keep in-memory data stucture (for now, TRIE is considered) for note names and aliases. And Suggest them when user typing is **similar** with keywords

# Terms
- keywords: A data structure to keep all notes and aliases of interest.

# Considerations

## Which Settings to offer users to limit target notes

- Directory
- tag

## Which Data Structure to store keywords

### TRIE

#### Each node includes
- path of file
- (optional) alias
- How many nodes below (cumulative)
- Frequently accessed descendant with count (and optionally date)

#### Ignoring case in TRIE
For our mission is user convinience and personally I'm very tired of adding case-different aliases, ignoring case in TRIE might be a good idea.

##### possible drawbacks?

## How to keep the keywords up-to-date

### Event Listener of this.app.metadataCache
- changed
- rename

### Edge Case testing
- latency of update in metadataCache
- If any change possible to be omitted

## Suggest.onTrigger

Need to determine when to show suggest 
- [ ] TODO later.

## Additional Thoughts

### How to handle typo?