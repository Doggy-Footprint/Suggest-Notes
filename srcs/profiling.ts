const isDev = process.env.NODE_ENV === 'development';

export function measurePerformance<T>(lines: () => T, label: string, desc?: string): T {
    if (!isDev) return lines();
    
    performance.mark(`start - ${label}`);

    const result = lines();

    performance.mark(`end - ${label}`);
    performance.measure(label, `start - ${label}`, `end - ${label}`);
    const measure = performance.getEntriesByName(label)[0];
    console.log(`${label} ${desc ?? ''} took ${measure.duration} ms`);

    return result;
}

export function measureFinerLatency<T>(lines: () => T, label: string, desc?: string): T {
    if (!isDev) return lines();

    const start = performance.now();

    const result = lines();

    const end = performance.now();

    console.log(`${label} ${desc ?? ''} took ${(end - start) * 100} micro sec`);

    return result;
}