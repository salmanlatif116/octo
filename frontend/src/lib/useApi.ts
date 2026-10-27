import { useCallback, useEffect, useRef, useState } from "react";

interface ApiState<T> {
    data: T | null;
    error: string | null;
    loading: boolean;
    /** Fetch again (e.g. after a change). Keeps showing the old data meanwhile. */
    reload: () => Promise<void>;
}

/** Load data when the component mounts or `deps` change. */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const seq = useRef(0);

    const reload = useCallback(async () => {
        const mine = ++seq.current;
        try {
            const result = await fetcherRef.current();
            if (mine !== seq.current) return; // a newer request replaced this one
            setData(result);
            setError(null);
        } catch (err) {
            if (mine !== seq.current) return;
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            if (mine === seq.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        reload();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return { data, error, loading, reload };
}
