import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor, PluginManifest, CachedMetadata } from 'obsidian';
import { PrefixTree, Content, Keyword, Statistic } from '../srcs/trie'
import { DEFAULT_SETTINGS, KeywordSuggestPluginSettings, KeywordSuggestPluginSettingTab } from './settings'
import { measurePerformance, measureFinerLatency } from 'srcs/profiling';
import RecentStatistic from './statistic';

export default class KeywordSuggestPlugin extends Plugin {
    trie: PrefixTree<TFile>;
    settings: KeywordSuggestPluginSettings
    getContentStatistic: (...args: any[]) => Statistic;
    getKeywordStatistic: (...args: any[]) => Statistic;

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.trie = new PrefixTree<TFile>();
    }

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new KeywordSuggestPluginSettingTab(this.app, this));

        this.app.workspace.onLayoutReady(() => {
            measurePerformance<void>(() => {
                this.app.vault.getFiles().forEach(file => this.addFileinTrie(file));
            }, 'INITIAL load');
        });

        this.registerEditorSuggest(new LinkSuggest(this.app, this.trie));
        this.registerEventListeners();
    }

    async loadSettings() {
        // TODO: let user determine Statistic policy
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.getContentStatistic = Statistic.getStatistic;
        this.getKeywordStatistic = RecentStatistic.getStatistic;
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private registerEventListeners() {
        // event for adding / modifing / deleting aliases or tags
        this.registerEvent(this.app.metadataCache.on('changed', (file, _, cache) => {
            if (!(file instanceof TFile) 
                || (!this.isFileIncluded(file, cache) && this.trie.search(this.getFileName(file)) === undefined)) return;
            let aliases: string[] = cache.frontmatter?.aliases ?? [];

            const name = this.getFileName(file);

            /**
             * this relies on the fact that 'changed' event is not called for 'rename' event.
             * see: https://github.com/obsidianmd/obsidian-api/issues/77
             */
            let content = this.trie.search(name)?.getContent(file);

            if (typeof content === 'undefined') {
                // new Content
                this.addFileinTrie(file);
            } else {
                // update existing Content
                const keywords = content.getAllKeywords().map(k => k.keyword);

                aliases.push(name);

                measureFinerLatency<void>(() => {
                    if (!(content instanceof Content)) return;
                    keywords.sort();
                    aliases.sort();

                    let i = 0, j = 0;
    
                    while (i < keywords.length && j < aliases.length) {
                        if (keywords[i] === aliases[j]) {
                            j++;
                            i++;
                            continue;
                        } else if (keywords[i] > aliases[j]) {
                            // missing in keywords - new aliases
                            this.addAliasinTrie(aliases[j++], content);
                        } else if (keywords[i] < aliases[j]) {
                            // missing in aliases - deleted aliases
                            this.trie.delete(keywords[i++], file);
                        }
                    }
    
                    while (j < aliases.length) {
                        // add remaining aliases
                        this.addAliasinTrie(aliases[j++], content);
                    }
                    
                    while (i < keywords.length) {
                        // delete remaining unmatched aliases
                        this.trie.delete(keywords[i++], file);
                    }
                }, 'changed event')
            }
        }));
        
        // event for file rename
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (!(file instanceof TFile)) return;

            const oldName = this.getFileName(oldPath);

            let content = this.trie.search(oldName)?.getContent(file);
            const isFileIncluded = this.isFileIncluded(file);

            if (!content && isFileIncluded) {
                this.addFileinTrie(file);
            } else if (!content && !isFileIncluded) {
                return;
            }
            else if (content && isFileIncluded) {
                this.trie.move(oldName, this.getFileName(file), file);
            } else if (content && !isFileIncluded) {
                this.trie.delete(oldName, file);

                const aliases = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;
                if (!aliases || !Array.isArray(aliases)) return;
                aliases.forEach((alias: string) => this.trie.delete(alias, file));
            }
        }));

        // event for file deletion
        this.registerEvent(this.app.metadataCache.on('deleted', (file, prevCache) => {
            measureFinerLatency(() => {
                if (!(file instanceof TFile) || this.trie.search(this.getFileName(file)) === undefined) return;
                this.trie.delete(this.getFileName(file), file);
                const aliases = prevCache?.frontmatter?.aliases;
                if (!aliases) return;
                aliases.forEach((alias: string) => this.trie.delete(alias, file));
            }, 'deleted event');
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
        if (file instanceof TFile) name = file.basename;
        else {
            const pathArray = file.split('/');
            name = pathArray[pathArray.length - 1];
            name = name.substring(0, name.lastIndexOf('.'));
        }
        return name;
    }

    addFileinTrie(file: TFile, jsonData?: any) {
        if (!this.isFileIncluded(file)) return;
    
        // TODO: use stored statistic instead of default new instance
        let content: Content<TFile> = new Content<TFile>(file, this.getContentStatistic(jsonData));
        this.trie.add(this.getFileName(file), content, this.getKeywordStatistic(jsonData)); 

        const aliases = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;

        if (Array.isArray(aliases)) {
            aliases.forEach(alias => this.trie.add(alias, content, this.getKeywordStatistic(jsonData)));
        }
    }

    addAliasinTrie(alias: string, content: Content<TFile>, jsonData?: any) {
        this.trie.add(alias, content, this.getKeywordStatistic(jsonData));
    }

    isFileIncluded(file: TFile, cache: CachedMetadata | null = null): boolean {
        if (!cache) cache = this.app.metadataCache.getFileCache(file);

        return this.settings.searchDirectories.some(dir => file.path.startsWith(dir))
        || cache?.frontmatter?.tags?.some((t: string) => this.settings.checkTags.includes(t));
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

        const suggestions = measureFinerLatency<Content<TFile>[] | undefined>(() => {
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

        suggestions.sort((a, b) => Keyword.compareDesc(a.keyword, b.keyword));

        return suggestions;
    }

    renderSuggestion(value: TFileContent, el: HTMLElement): void {
        if (!this.context) return;
        el.createDiv().setText(`${value.content.read(false).basename}\n${value.keyword.keyword}`);
    }

    selectSuggestion(value: TFileContent, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        const { start, end } = this.context;
        value.content.readWithKeyword(value.keyword.keyword);
        this.context?.editor.replaceRange(`[[${value.content.read().path}|${value.keyword.keyword}]]`, start, end);
    }
}