import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor } from 'obsidian';
import { PrefixTree, Node, Content } from '../srcs/trie'
// import { TFileContent } from './obsidian_trie'

const TEST_KEYWORDS_DIRECTORY = 'TEST_KEYWORDS/KEYWORDS';
const TEST_KEYWORDS_TAGS = ['keyword', 'pkm', 'frequently-used'];

export default class KeywordSuggestPlugin extends Plugin {
    trie: PrefixTree<TFile> = new PrefixTree<TFile>();

    onload() {
        this.registerEditorSuggest(new LinkSuggest(this.app));
    }

    onunload() {
        
    }
}

interface TFileContent {
    content: Content<TFile>,
    keyword: string
}

export class LinkSuggest extends EditorSuggest<TFileContent> {
    trie: PrefixTree<TFile> = new PrefixTree<TFile>();

    constructor(app: App) {
        super(app);
        this.loadFiles();
        this.limit = 8; // TODO: ask someone with UI/UX knowledge
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

    getSuggestions(context: EditorSuggestContext): TFileContent[] | Promise<TFileContent[]> {
        const contents = this.trie.search(context.query)?.getSuggestion();
        if (!contents) return [];

        const suggestions: TFileContent[] = [];

        if (!this.context) return [];
        contents.forEach(c => c.getKeywords(this.context!.query).forEach(k => {
            suggestions.push({content: c, keyword: k});
        }));

        return suggestions;
    }

    renderSuggestion(value: TFileContent, el: HTMLElement): void {
        if (!this.context) return;
        el.createDiv().setText(`${value.content.read(false).name}\n${value.keyword}`);
    }

    selectSuggestion(value: TFileContent, evt: MouseEvent | KeyboardEvent): void {
        if (!this.context) return;
        const { start, end } = this.context;
        value.content.updateKeywords(value.keyword);
        this.context?.editor.replaceRange(`[[${value.content.read().name.split('.')[0]}|${value.keyword}]]`, start, end);
    }
}