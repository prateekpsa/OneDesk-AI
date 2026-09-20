import * as React from 'react';

/**
 * Calls `refetch` immediately, then again every `intervalMs`, clearing the
 * timer on unmount or whenever `deps` changes (pass `refetch` itself in
 * `deps` when it's a useCallback so a team/service change restarts the timer).
 */
export function useAutoRefresh(refetch: () => void, intervalMs: number, deps: React.DependencyList): void {
  React.useEffect(() => {
    refetch();
    const id = setInterval(refetch, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
