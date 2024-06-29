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

## Suggest

### onTrigger

Need to determine when to show suggest 
- [ ] TODO later.

## keywords
Current version allows user to get Content<TFile> with relatively short search query.
The problem is to determine which keyword(file name, alias, etc) should use.

The thing is, the program can't know user's thought unless the user gives it. 
And in technical point of view, each node can keep keywords with its Content, and suggest user the Content<TFile> and keyword at the same time. - this is for later update.

For now a option is let user to decide which keywords to use based on current input, for example, if the user typed 'ip', and the plugin showed iPad, and iPhone. And user choosed iPad. Now assume that iPad note has aliases of ipad, pad, apple pad. then from the input ip, we can filter keywords to ipad and iPad. It would be better if we show such keywords ahead and the others below.

- [ ] How to make another suggetion container based on selectSuggestion?
    - possible, but with too much effort

### Solutions

1. use wrapper instead of Content<TFile> for type of EditorSuggest class. and Include DOM object into the wrapper so that render some kinda keywords suggestion after selectin TFile
2. From user input, filter Content's related nodes' keyword and Show the TFile for each keyword filtered. Manage keyword preferrence based in Content.
3. Modify PrefixTree so that metadata of Node include keyword with Content object.
4. Let Content includes preferredKeywords.

## Additional Thoughts

### How to handle typo?


# TODO

- [ ] Plugin not working before manually reload plugin after reloading the app