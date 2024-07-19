import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor, PluginManifest, CachedMetadata } from 'obsidian';
import { PrefixTree, Content, Keyword } from '../srcs/trie'
import { DEFAULT_SETTINGS, KeywordSuggestPluginSettings, KeywordSuggestPluginSettingTab } from './settings'
import { measurePerformance, measureFinerLatency } from 'srcs/profiling';

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
        this.app.workspace.onLayoutReady(() => {
            measurePerformance<void>(() => {
                this.app.vault.getFiles().forEach(file => this.addFileinTrie(file));
            }, 'INITIAL load'); 
        });

        this.registerEditorSuggest(new LinkSuggest(this.app, this.trie));
        this.registerEventListeners();
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // TODO reflect changes of settings on trie
        // Postpone useCount to dev later
    }

    private registerEventListeners() {
        /**
         * TODO: check user scenarios
         */
        this.registerEvent(this.app.metadataCache.on('changed', (file, _, cache) => {
            if (!(file instanceof TFile) 
                || (!this.isFileIcluded(file, cache) && this.trie.search(this.getFileName(file)) === undefined)) return;
            let aliases: string[] = cache.frontmatter?.aliases ?? [];

            const name = this.getFileName(file);

            /**
             * this relies on the fact that 'changed' event is not called for 'rename' event.
             * see: https://github.com/obsidianmd/obsidian-api/issues/77
             */
            let content = this.trie.search(name)?.getContent(file);

            if (!content) {
                // new Content
                this.addFileinTrie(file);
            } else {
                // update existing Content
                const keywords = content.getAllKeywords().map(k => k.keyword);

                aliases.push(name);

                measurePerformance<void>(() => {
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
                            this.trie.add(aliases[j++], content);
                        } else if (keywords[i] < aliases[j]) {
                            // missing in aliases - deleted aliases
                            this.trie.delete(keywords[i++], file);
                        }
                    }
    
                    while (j < aliases.length) {
                        // add remaining aliases
                        this.trie.add(aliases[j++], content);
                    }
                    
                    while (i < keywords.length) {
                        // delete remaining unmatched aliases
                        this.trie.delete(keywords[i++], file);
                    }
                }, 'changed event')
            }
        }));
        
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            if (!(file instanceof TFile)) return;

            const oldName = this.getFileName(oldPath);

            let content = this.trie.search(oldName)?.getContent(file);
            const isFileIcluded = this.isFileIcluded(file);

            if (!content && isFileIcluded) {
                this.addFileinTrie(file);
            } else if (!content && !isFileIcluded) {
                return;
            }
            else if (content && isFileIcluded) {
                this.trie.move(oldName, this.getFileName(file), file);
            } else if (content && !isFileIcluded) {
                this.trie.delete(oldName, file);

                const aliases = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;
                if (!aliases || !Array.isArray(aliases)) return;
                aliases.forEach((alias: string) => this.trie.delete(alias, file));
            }
        }));

        this.registerEvent(this.app.metadataCache.on('deleted', (file, prevCache) => {
            if (!(file instanceof TFile) || this.trie.search(this.getFileName(file)) === undefined) return;
            this.trie.delete(this.getFileName(file), file);
            const aliases = prevCache?.frontmatter?.aliases;
            if (!aliases) return;
            aliases.forEach((alias: string) => this.trie.delete(alias, file));
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

    addFileinTrie(file: TFile) {
        if (!this.isFileIcluded(file)) return;
    
        let content: Content<TFile> = new Content<TFile>(file);
        this.trie.add(this.getFileName(file), content); 

        const aliases = this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases;

        if (Array.isArray(aliases)) {
            aliases.forEach(alias => this.trie.add(alias, content));
        }
    }

    isFileIcluded(file: TFile, cache: CachedMetadata | null = null): boolean {
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
        el.createDiv().setText(`${value.content.read(false).basename}\n${value.keyword.keyword}`);
    }

    selectSuggestion(value: TFileContent, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        const { start, end } = this.context;
        value.content.readWithKeyword(value.keyword.keyword);
        this.context?.editor.replaceRange(`[[${value.content.read().path}|${value.keyword.keyword}]]`, start, end);
    }
}