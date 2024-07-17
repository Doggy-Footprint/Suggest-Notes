import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor, PluginManifest, CachedMetadata } from 'obsidian';
import { PrefixTree, Content, Keyword } from '../srcs/trie'
import { DEFAULT_SETTINGS, KeywordSuggestPluginSettings, KeywordSuggestPluginSettingTab } from './settings'

const isDev = process.env.NODE_ENV === 'development';

function measurePerformance<T>(lines: () => T, label: string, desc?: string): T {
    if (!isDev) return lines();
    
    performance.mark(`start - ${label}`);

    const result = lines();

    performance.mark(`end - ${label}`);
    performance.measure(label, `start - ${label}`, `end - ${label}`);
    const measure = performance.getEntriesByName(label)[0];
    console.log(`${label} ${desc ?? ''} took ${measure.duration} ms`);
}

export default class KeywordSuggestPlugin extends Plugin {
    trie: PrefixTree<TFile>;
    settings: KeywordSuggestPluginSettings

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.trie = new PrefixTree<TFile>();
    }

    async onload() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new KeywordSuggestPluginSettingTab(this.app, this));
        
        // TODO : after saving usage, load the saved usage to set each Content and Keyword object
        this.app.vault.getFiles().forEach(file => this.addFileinTrie(this.trie, file));

        this.registerEditorSuggest(new LinkSuggest(this.app, this.trie));
        this.registerEventListeners();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // TODO reflect changes of settings on trie
        // Postpone useCount to dev later
    }

    private registerEventListeners() {        
        this.registerEvent(this.app.metadataCache.on('changed', (file, _, cache) => {
            if (!(file instanceof TFile) || !this.isFileIcluded(file)) return;
            const aliases = cache.frontmatter?.aliases;

            // TODO: how to distinguish create and modify? maybe use MessageQueue and both vault.create, and metadataCache.changed
        }));
        
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (!(file instanceof TFile) || !this.isFileIcluded(file)) return;
            this.trie.move(this.getFileName(oldPath), this.getFileName(file), file);
        }));

        this.registerEvent(this.app.metadataCache.on('deleted', (file, prevCache) => {
            if (!(file instanceof TFile) || !this.isFileIcluded(file)) return;
            // TODO
        }))
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

    isFileIcluded(file: TFile, cache: CachedMetadata | null = null): boolean {
        if (!cache) cache = this.app.metadataCache.getFileCache(file);

        const result = measurePerformance<boolean>(() => {
            return this.settings.searchDirectories.some(dir => file.path.startsWith(dir))
            || cache?.frontmatter?.tags?.some((t: string) => this.settings.checkTags.includes(t));
        }, 'isFileIcluded');

        return result;
    }
}

interface TFileContent {
    content: Content<TFile>,
    keyword: Keyword
}

export class LinkSuggest extends EditorSuggest<TFileContent> {
    trie: PrefixTree<TFile>;

    constructor(app: App, trie: PrefixTree<TFile>) {
        super(app);
        this.trie = trie;
        this.limit = 8; // TODO: ask someone with UI/UX knowledge
    }

    public onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
        if (cursor.ch == 0) return null;

        const { word, startIndex } = this.getWord(cursor, editor);
        if (word.length < 2) return null;

        const suggestions = measurePerformance<Content<TFile>[] | undefined>(() => {
            return this.trie.search(word)?.getSuggestion();
        }, 'getSuggestion', 'onTrigger')

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