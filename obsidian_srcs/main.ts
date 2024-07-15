import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor, PluginManifest } from 'obsidian';
import { PrefixTree, Content, Keyword } from '../srcs/trie'
import { DEFAULT_SETTINGS, KeywordSuggestPluginSettings, KeywordSuggestPluginSettingTab } from './settings'

const isDev = process.env.NODE_ENV === 'development';

interface EventMessage {
    path: string,
    file: TFile,
    aliases: string[],
    changes: 'new' | 'delete' | 'modify'
}

class MessageQueue {
    app: App;
    plugin: KeywordSuggestPlugin
    trie: PrefixTree<TFile>;
    messages: EventMessage[];
    head: number;
    tail: number;
    static readonly cutoff = 30;
    static readonly maximum_size = 1000;

    constructor(app: App, plugin: KeywordSuggestPlugin, trie: PrefixTree<TFile>) {
        this.app = app;
        this.plugin = plugin
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
        if (isDev)
            performance.mark('start - processSingleMessage');

        if (this.head === this.tail) return;
        
        const message = this.messages[this.head++];
        const name = this.plugin.getFileName(message.path);

        switch (message.changes) {
            case 'new': { // currently not used
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
                const content = this.trie.search(name)?.getContent(message.file);
                const keywords = content?.getAllKeywords().map(k => k.keyword);

                const aliases = this.app.metadataCache.getFileCache(message.file)?.frontmatter?.aliases;

                if (!keywords || !aliases) break;

                aliases.push(name);

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

        if (isDev) {
            performance.mark('end - processSingleMessage');
            performance.measure('processSingleMessage', 'start - processSingleMessage', 'end - processSingleMessage');

            const measure = performance.getEntriesByName('processSingleMessage')[0];
            console.log(`\t\tprocessSingleMessage took ${measure.duration} ms`);
        }
    }

    public processAll() {
        if (isDev) {
            performance.mark('start - processAll');
        }

        while (this.head !== this.tail) {
            this.processSingleMessage();
        }
        this.resetQueue();

        if (isDev) {
            performance.mark('end - processAll');
            performance.measure('processAll', 'start - processAll', 'end - processAll');

            const measure = performance.getEntriesByName('processAll')[0];
            console.log(`\tprocessAll took ${measure.duration} ms`);
        }
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
    settings: KeywordSuggestPluginSettings

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.trie = new PrefixTree<TFile>();
        this.messageQueue = new MessageQueue(this.app, this, this.trie);
    }

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new KeywordSuggestPluginSettingTab(this.app, this));
        
        // TODO : after saving usage, load the saved usage to set each Content and Keyword object
        this.app.vault.getFiles().forEach(file => this.addFileinTrie(this.trie, file));

        this.registerEditorSuggest(new LinkSuggest(this.app, this.trie, this.messageQueue));
        this.registerEventListeners();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // TODO reflect changes of settings on trie
        // Postpone useCount to dev later
    }

    private registerEventListeners() {
        this.app.workspace.onLayoutReady(() => {
            this.registerEvent(this.app.vault.on('create', file => {
                if (!(file instanceof TFile) || !this.isFileIcluded(file)) return;
                console.log('on create')
                this.addFileinTrie(this.trie, file);
            }));
        });

        this.registerEvent(this.app.vault.on('modify', file => {
            if (!(file instanceof TFile) || !this.isFileIcluded(file)) return;
            console.log('on modify');
            this.messageQueue.processSingleMessage();
            this.messageQueue.enqueue({
                path: file.path,
                file: file,
                aliases: [],
                changes: 'modify'
            })
        }));

        this.registerEvent(this.app.vault.on('delete', file => {
            if (!(file instanceof TFile)) return;

            console.log('on delete');

            const node = this.trie.search(this.getFileName(file));
            const content = node?.getContent(file)?.cleanUp();
        }));

        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (!(file instanceof TFile)) return;

            console.log('on rename');

            const oldPathArray = oldPath.split('/');
            const name = oldPathArray[oldPathArray.length - 1];

            this.trie.move(name.split('.')[0], this.getFileName(file), file);
        }));
    }

    async onunload() {
        await this.saveSettings();
    }

    /**
     * 
     * @param file TFile or string. For string, file needs to be either path or file name
     * @returns 
     */
    getFileName(file: TFile | string): string {
        let name: string;
        if (file instanceof TFile) name = file.name;
        else name = file;
    
        const pathArray = name.split('/');
        if (pathArray.length > 1) name = pathArray[pathArray.length - 1];
        
        return name.substring(0, name.lastIndexOf('.'));
    }

    addFileinTrie(trie: PrefixTree<TFile>, file: TFile) {
        if (!this.isFileIcluded(file)) return;
    
        let content: Content<TFile> = new Content<TFile>(file);
        trie.add(this.getFileName(file), content); 
    
        const aliases = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;
    
        if (Array.isArray(aliases)) {
            aliases.forEach(alias => trie.add(alias, content));
        }
    }

    isFileIcluded(file: TFile): boolean {
    if (this.settings.searchDirectories.some(dir => file.path.startsWith(dir)))
        return true;
    if (this.app.metadataCache.getFileCache(file)?.frontmatter?.tags?.some((t: string) => this.settings.checkTags.includes(t)))
        return true;
    return false;
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
        this.limit = 8; // TODO: ask someone with UI/UX knowledge
    }

    public onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
        /**
         * NOTE
         * onTrigger is required to quickly reply. But as the this.messageQueue process messages on each modify, I assumed
         * that the number of remaining messages would be relatively ignorably small.
         */
        this.messageQueue.processAll();
        if (cursor.ch == 0) return null;

        const { word, startIndex } = this.getWord(cursor, editor);
        if (word.length < 2) return null;

        if (isDev) {
            performance.mark('start - getSuggestion in onTrigger');
        }
        const suggestions = this.trie.search(word)?.getSuggestion();
        if (isDev) {
            performance.mark('end - getSuggestion in onTrigger');
            performance.measure('getSuggestion in onTrigger', 'start - getSuggestion in onTrigger', 'end - getSuggestion in onTrigger');
            const measure = performance.getEntriesByName('getSuggestion in onTrigger')[0];
            console.log(`getSuggestion in onTrigger took ${measure.duration} ms`);
        }

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

        // TODO: let new comer come first
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
        this.context?.editor.replaceRange(`[[${value.content.read().name.split('.')[0]}|${value.keyword.keyword}]]`, start, end);
    }
}