import { TFile, CachedMetadata } from "obsidian";

export function parseLinkNames(file: TFile, fileCache: CachedMetadata): string[] {
    let names: string[] = [file.basename];
    // TODO: check typescript Index Signature
    if (fileCache.frontmatter?.aliases?.length > 0) {
        names.push(...fileCache.frontmatter?.aliases);
    }
    return names;
}