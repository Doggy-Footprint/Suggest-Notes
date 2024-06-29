import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor } from 'obsidian';
import { PrefixTree, Node, Content } from '../srcs/trie'
import { cursorTo } from 'readline';
// import { TFileContent } from './obsidian_trie'

const TEST_KEYWORDS_DIRECTORY = 'TEST_KEYWORDS/KEYWORDS';
const TEST_KEYWORDS_TAGS = ['keyword', 'pkm', 'frequently-used'];

export default class KeywordSuggestPlugin extends Plugin {
    trie: PrefixTree<TFile> = new PrefixTree<TFile>();

    onload() {
        this.registerEditorSuggest(new KeywordSuggest(this.app));
    }

    onunload() {
        
    }
}

export class KeywordSuggest extends EditorSuggest<Content<TFile>> {
    trie: PrefixTree<TFile> = new PrefixTree<TFile>();

    constructor(app: App) {
        super(app);
        this.loadFiles();
    }

    private loadFiles() {
        const files = this.app.vault.getFiles();
        for (const file of files) {
            let isKeywordNote: boolean = false;
            if (file.path.startsWith(TEST_KEYWORDS_DIRECTORY)) {
                isKeywordNote = true;
            } else {
                if (this.app.metadataCache.getFileCache(file)?.frontmatter?.tags?.some((t: string) => TEST_KEYWORDS_TAGS.includes(t)))
                    isKeywordNote = true;
            }
            if (isKeywordNote) {
                let content: Content<TFile> = new Content<TFile>(file);
                this.trie.add(file.name.split('.')[0], content);
                if (!Array.isArray(this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases)) continue;
                for (const alias of this.app.metadataCache.getFileCache(file)?.frontmatter?.aliases) {
                    this.trie.add(alias, content);
                }
            }
        }
    }

    public onTrigger(cursor: EditorPosition, editor: Editor, file: TFile | null): EditorSuggestTriggerInfo | null {
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

    getSuggestions(context: EditorSuggestContext): Content<TFile>[] | Promise<Content<TFile>[]> {
        // dummy for wrong query
        return this.trie.search(context.query)?.getSuggestion() ?? [];
    }

    renderSuggestion(value: Content<TFile>, el: HTMLElement): void {
        const outer = el.createDiv().setText(value.read(false).name);
    }

    selectSuggestion(value: Content<TFile>, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        const { start, end } = this.context;
        this.context?.editor.replaceRange(`[[${value.read().path}]]`, start, end);
    }
}