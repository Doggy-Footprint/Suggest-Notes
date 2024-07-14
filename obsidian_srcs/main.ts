import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor, PluginManifest } from 'obsidian';
import { PrefixTree, Node, Content, Keyword } from '../srcs/trie'
// import { TFileContent } from './obsidian_trie'

const TEST_KEYWORDS_DIRECTORY = 'TEST_KEYWORDS/KEYWORDS';
const TEST_KEYWORDS_TAGS = ['keyword', 'pkm', 'frequently-used'];

/**
 * 
 * @param file TFile or string. For string, file needs to be either path or file name
 * @returns 
 */
function getFileName(file: TFile | string): string {
    let name: string;
    if (file instanceof TFile) name = file.name;
    else name = file;

    const pathArray = name.split('/');
    if (pathArray.length > 1) name = pathArray[pathArray.length - 1];
    
    return name.substring(0, name.lastIndexOf('.'));
}

function addFileinTrie(trie: PrefixTree<TFile>, file: TFile) {
    if (!isFileIcluded(file)) return;

    let content: Content<TFile> = new Content<TFile>(file);
    trie.add(getFileName(file), content); 

    const aliases = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;

    if (Array.isArray(aliases)) {
        aliases.forEach(alias => trie.add(alias, content));
    }
}

// TODO: use setting afterward
function isFileIcluded(file: TFile): boolean {
    if (file.path.startsWith(TEST_KEYWORDS_DIRECTORY)) 
        return true;
    else if (this.app.metadataCache.getFileCache(file)?.frontmatter?.tags?.some((t: string) => TEST_KEYWORDS_TAGS.includes(t)))
        return true;
    else 
        return false;
}

interface EventMessage {
    path: string,
    file: TFile,
    aliases: string[],
    changes: 'new' | 'delete' | 'modify'
}

class MessageQueue {
    app: App;
    trie: PrefixTree<TFile>;
    messages: EventMessage[];
    head: number;
    tail: number;
    static readonly cutoff = 30;
    static readonly maximum_size = 1000;

    constructor(app: App, trie: PrefixTree<TFile>) {
        this.app = app;
        this.trie = trie;
        this.messages = [];
        this.head = 0;
        this.tail = 0;
    }

    public enqueue(message: EventMessage) {
        if (this.head === this.tail && this.head !== 0) {
            this.resetQueue();
        }
        if (this.head > MessageQueue.cutoff) {
            // discard finished messages
            this.messages.splice(0, this.head);
            this.head = 0;
            this.tail = this.tail - MessageQueue.cutoff;
        }
        if (this.tail - this.head > MessageQueue.maximum_size)
            console.error('MessageQueue oversized');
        this.messages[this.tail++] = message;
    }

    public processSingleMessage() {
        if (this.head === this.tail) return;
        
        const message = this.messages[this.head++];
        const name = getFileName(message.path);

        switch (message.changes) {
            case 'new': { // currently not used
                // TODO: implement bulk add in PrefixTree and use it.
                const content = new Content<TFile>(message.file)
                this.trie.add(name, content);
                message.aliases.forEach(alias => this.trie.add(alias, content));
                break;
            }
            case 'delete': { // currently not used
                const content = this.trie.search(name)?.getContent(message.file);
                if (content) content.cleanUp();
                break;
            }
            case 'modify': {
                // TODO: read aliases from file cache when processing 
                const content = this.trie.search(name)?.getContent(message.file);
                const keywords = content?.getAllKeywords().map(k => k.keyword);

                const aliases = this.app.metadataCache.getFileCache(message.file)?.frontmatter?.aliases;

                if (!keywords || !aliases) break;
                keywords.sort();
                aliases.sort();

                let i = 0, j = 0;
                while (i < keywords.length && j < aliases.length) {
                    if (i < keywords.length && keywords[i] === aliases[j]) {
                        j++;
                        i++;
                        continue;
                    } else if (keywords[i] > aliases[j]) {
                        // missing in keywords - new aliases
                        this.trie.add(aliases[j++], content);
                    } else if (keywords[i] < aliases[j]) {
                        // missing in aliases - deleted aliases
                        this.trie.delete(keywords[i++], message.file);
                    }
                }

                while (j < aliases.length) {
                    this.trie.add(aliases[j++], content);
                }
                
                while (i < keywords.length) {
                    this.trie.delete(keywords[i++], message.file);
                }

                break;
            }
            default: {
                console.error('Unknown Changes type in EventMessage')
            }
        }

        if (this.head === this.tail)
            this.resetQueue();
    }

    public processAll() {
        while (this.head !== this.tail) {
            this.processSingleMessage();
        }
        this.resetQueue();
    }

    private resetQueue() {
        this.messages = [];
        this.head = 0;
        this.tail = 0;
    }
}

export default class KeywordSuggestPlugin extends Plugin {
    trie: PrefixTree<TFile>;
    messageQueue: MessageQueue;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.trie = new PrefixTree<TFile>();
        this.messageQueue = new MessageQueue(this.app, this.trie);
    }

    onload() {
        this.registerEditorSuggest(new LinkSuggest(this.app, this.trie, this.messageQueue));

        this.registerEventListeners();


    }

    private registerEventListeners() {
        // create
        this.app.workspace.onLayoutReady(() => {
            this.registerEvent(this.app.vault.on('create', file => {
                if (!(file instanceof TFile) || !isFileIcluded(file)) return;
                console.log('on create')
                addFileinTrie(this.trie, file);
            }));
        });

        // modify
        this.registerEvent(this.app.vault.on('modify', file => {
            if (!(file instanceof TFile) || !isFileIcluded(file)) return;
            console.log('on modify');
            this.messageQueue.processSingleMessage();
            this.messageQueue.enqueue({
                path: file.path,
                file: file,
                aliases: [],
                changes: 'modify'
            })
        }));

        //  delete
        this.registerEvent(this.app.vault.on('delete', file => {
            if (!(file instanceof TFile)) return;

            console.log('on delete');

            const node = this.trie.search(getFileName(file));
            const content = node?.getContent(file)?.cleanUp();
        }));

        // TODO
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (!(file instanceof TFile)) return;

            console.log('on rename');

            const oldPathArray = oldPath.split('/');
            const name = oldPathArray[oldPathArray.length - 1];

            this.trie.move(name.split('.')[0], getFileName(file), file);
        }));
    }

    onunload() {
        
    }

    
}

interface TFileContent {
    content: Content<TFile>,
    keyword: Keyword
}

export class LinkSuggest extends EditorSuggest<TFileContent> {
    trie: PrefixTree<TFile>;
    messageQueue: MessageQueue;

    constructor(app: App, trie: PrefixTree<TFile>, messageQueue: MessageQueue) {
        super(app);
        this.trie = trie;
        this.messageQueue = messageQueue;
        this.loadFiles();
        this.limit = 8; // TODO: ask someone with UI/UX knowledge
    }

    private loadFiles() {
        const files = this.app.vault.getFiles();
        for (const file of files) {
            addFileinTrie(this.trie, file);
        }
    }

    public onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
        this.messageQueue.processAll(); // TODO check if is this right place to processAll
        if (cursor.ch == 0) return null;

        const { word, startIndex } = this.getWord(cursor, editor);
        if (word.length < 2) return null;

        // TODO: can I refactor it to pass suggestions to this.getSuggestions?
        const suggestions = this.trie.search(word)?.getSuggestion();
        if (!suggestions) return null;

        return {
            start: {
                line: cursor.line,
                ch: startIndex
            },
            end : {
                line: cursor.line,
                ch: cursor.ch
            },
            query: word
        };
    }

    // TODO: test edge cases 
    private getWord(cursor: EditorPosition, editor: Editor): { word: string, startIndex: number} {
        // It seems ch = 0 is not provided in onTrigger.

        const line = editor.getLine(cursor.line);

        let start = 0;

        for (let i = cursor.ch - 1; i >= 0; i--) {
            if (line.charAt(i) == ' ' || line.charAt(i) == '\t') {
                start = i+1;
                break;
            }
        }

        return { word: line.slice(start, cursor.ch), startIndex: start };
    }

    getSuggestions(context: EditorSuggestContext): TFileContent[] | Promise<TFileContent[]> {
        const contents = this.trie.search(context.query)?.getSuggestion();
        if (!contents) return [];

        const suggestions: TFileContent[] = [];

        if (!this.context) return [];
        contents.forEach(c => c.getKeywords(this.context!.query).forEach(k => {
            suggestions.push({content: c, keyword: k});
        }));

        // TODO: let new comer come first, not stable sorting.
        suggestions.sort((a, b) => b.keyword.getScore() - a.keyword.getScore());

        return suggestions;
    }

    renderSuggestion(value: TFileContent, el: HTMLElement): void {
        if (!this.context) return;
        el.createDiv().setText(`${value.content.read(false).name}\n${value.keyword.keyword}`);
    }

    selectSuggestion(value: TFileContent, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        const { start, end } = this.context;
        value.content.readWithKeyword(value.keyword.keyword);
        // score is for testing
        this.context?.editor.replaceRange(`[[${value.content.read().name.split('.')[0]}|${value.keyword.keyword} - ${value.keyword.getScore()}]]`, start, end);

        // Issue: if alias is the same with name of note or other aliases ignoring case, errorneous behavior happens
    }
}