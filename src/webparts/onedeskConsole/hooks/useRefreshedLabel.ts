import * as React from 'react';

function relativeTime(seconds: number): string {
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
}

/** "Refreshed Ns ago", ticking every second from the last time `lastRefreshedAt` changed. */
export function useRefreshedLabel(lastRefreshedAt: number): string {
  const [seconds, setSeconds] = React.useState<number>(0);

  React.useEffect(() => {
    setSeconds(Math.round((Date.now() - lastRefreshedAt) / 1000));
    const id = window.setInterval(() => setSeconds(Math.round((Date.now() - lastRefreshedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [lastRefreshedAt]);

  return `Refreshed ${relativeTime(seconds)}`;
}
