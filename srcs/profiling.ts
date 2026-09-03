const isDev = process.env.NODE_ENV === 'development';

export function measurePerformance<T>(lines: () => T, label: string, desc?: string): T {
    if (!isDev) return lines();

    const startMark = `start - ${label}`;
    const endMark = `end - ${label}`;

    performance.mark(startMark);
    const result = lines();
    performance.mark(endMark);

    performance.measure(label, startMark, endMark);
    const measures = performance.getEntriesByName(label, 'measure');
    const measure = measures[measures.length - 1];
    console.log(`${label} ${desc ?? ''} took ${measure.duration} ms`);

    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(label);

    return result;
}

export function measureFinerLatency<T>(lines: () => T, label: string, desc?: string): T {
    if (!isDev) return lines();

    const start = performance.now();
    const result = lines();
    const end = performance.now();

    // performance.now() is in ms; ms -> microsec is *1000, not *100.
    console.log(`${label} ${desc ?? ''} took ${(end - start) * 1000} micro sec`);

    return result;
}