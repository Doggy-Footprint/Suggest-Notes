import { Statistic } from '../srcs/trie'

export default class RecentStatistic extends Statistic {
    private static recentlyUsed: Statistic[] = [];
    private static readonly cutoff = 5;

    public static getStatistic(jsonData?: any): RecentStatistic {
        return new RecentStatistic(jsonData?.useCount, jsonData?.lastUsed);
    }

    public update() {
        super.update();
        this.updateRecentStatistics()
    }

    private updateRecentStatistics() {
        console.log(RecentStatistic.recentlyUsed);
        if (RecentStatistic.recentlyUsed.contains(this)) return;
        if (RecentStatistic.recentlyUsed.length < RecentStatistic.cutoff) {
            RecentStatistic.recentlyUsed.unshift(this);
        } else {
            RecentStatistic.recentlyUsed = [this, ...RecentStatistic.recentlyUsed.slice(0, RecentStatistic.cutoff - 1)];
        }
    }

    public compare(b: RecentStatistic): number {
        const thisInRecent = RecentStatistic.recentlyUsed.contains(this);
        const bInRecent = RecentStatistic.recentlyUsed.contains(b);
        
        if (thisInRecent && !bInRecent) return -1;
        if (!thisInRecent && bInRecent) return 1;
        
        return super.compare(b);
    }

    public compareDesc(b: RecentStatistic): number {
        const thisInRecent = RecentStatistic.recentlyUsed.contains(this);
        const bInRecent = RecentStatistic.recentlyUsed.contains(b);
        
        if (thisInRecent && !bInRecent) return -1;
        if (!thisInRecent && bInRecent) return 1;

        return super.compareDesc(b);
    }
}