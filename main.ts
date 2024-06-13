import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor } from 'obsidian';
import { parseLinkNames } from 'srcs/obsidian_utils';
import { getCommonElements } from 'srcs/utils';
import { Keywords } from 'srcs/keywords';

const TEST_KEYWORDS_DIRECTORY = 'TEST_KEYWORDS/KEYWORDS';
const TEST_KEYWORDS_TAGS = ['keyword', 'pkm', 'frequently-used'];

export default class KeywordSuggestPlugin extends Plugin {
    keywords: Keywords = new Keywords();

    onload() {
        this.loadKeywords();
        // TODO: how can I test this.keywords here as TDD? not just logging it.
        // console.log(this.keywords); // checked

        this.listenKeywordsUpdate();


        // this.registerEditorSuggest(new KeywordSuggest(this.app));

        // this.listenKeywordUpdates();
    }

    loadKeywords() {
        this.app.vault.getFiles().forEach(f => {
            const cache = this.app.metadataCache.getFileCache(f);
            // TODO: check in which case cache can be null
            if (!cache) return;
            if (f.path.startsWith(TEST_KEYWORDS_DIRECTORY)) {
                this.keywords.addKeywords(parseLinkNames(f, cache));
            } else {
                const TagCaches = cache?.tags;
                if (!TagCaches) return;
                const tags = TagCaches.map(e => e.tag);
                if (getCommonElements(TEST_KEYWORDS_TAGS, tags).length > 0) {
                    this.keywords.addKeywords(parseLinkNames(f, cache));
                }
            }
        });
    }

    listenKeywordsUpdate() {
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            // keep in mind that filename might be duplicate with aliases. So must check 
            // TODO: does TFile object point to the same file if the name is changed?
            // TODO: from above conclusion, make event listening callback to update keywords
            // TODO: summarize rename events.
            console.log('renamed');
            console.log(file.path);
            console.log(oldPath);
            console.log('------');
        }));

    }

    //TODO
    listenKeywordUpdates() {
        this.app.metadataCache.on('changed', (file, _, cache) => {
            /**
             * called 
             * - when aliases are added with ctrl + ;
             * - alias is added (enter or clicking outside)
             * - alias is deleted
             * 
             * cb (file: TFile, data: string, cache: CachedMetadata)
             * file: file with change
             * data: file's content
             * cache: cache(changed)
             */

            // TODO: update Keywords
            console.log(cache.frontmatter?.aliases);
        });

        // add rename listener for filename changed
        this.registerEvent(this.app.vault.on('rename', (file, oldPath) => {
            // keep in mind that filename might be duplicate with aliases. So must check 
            // TODO: does TFile object point to the same file if the name is changed?
            // TODO: from above conclusion, make event listening callback to update keywords
        }));
    }

    onunload() {
        console.log('Unloading KeywordSuggestPlugin');
    }
}
