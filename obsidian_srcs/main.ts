import { App, Plugin, TFile, MarkdownView, EditorSuggest, EditorSuggestTriggerInfo, EditorSuggestContext, EditorPosition, Editor } from 'obsidian';
// import { parseLinkNames } from 'obsidian_srcs/obsidian_utils';
// import { getCommonElements } from 'srcs/utils';

const TEST_KEYWORDS_DIRECTORY = 'TEST_KEYWORDS/KEYWORDS';
const TEST_KEYWORDS_TAGS = ['keyword', 'pkm', 'frequently-used'];


export default class KeywordSuggestPlugin extends Plugin {
    onload() {
        console.log(`Loading ${this.constructor.name}`);
    }

    onunload() {
        console.log(`Unloading ${this.constructor.name}`);
    }
}