// Keep Keywords independent of Obsidian to test it 
export class Keywords {
    keywords: string[];

    constructor() {
        this.keywords = [];
    }

    addKeywords(keyword: string[]) {
        this.keywords.push(...keyword);
    }
}
