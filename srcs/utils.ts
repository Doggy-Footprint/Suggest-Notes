// TODO: refactor
export function getCommonElements<T>(a: T[], b: T[]): T[] {
    let commons: Set<T> = new Set<T>();
    for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
            if (a[i] == b[j]) commons.add(a[i]);
        }
    }
    return Array.from(commons);
}

export function compareWithoutCase(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
}