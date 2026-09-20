import * as React from 'react';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { IUserRole } from '../models/IUserRole';
import { deriveRole } from '../services/config';

export interface IUseUserRoleResult {
  role: IUserRole | undefined;
  loading: boolean;
  error: string | undefined;
  retry: () => void;
}

/**
 * Resolves the signed-in person's role once (Phase 5, build_plan.md). On
 * failure, falls back to employee - never admin - with an error message the
 * shell can show alongside a retry button.
 */
export function useUserRole(service: IOneDeskDataService, email: string, displayName: string): IUseUserRoleResult {
  const [role, setRole] = React.useState<IUserRole | undefined>(undefined);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [attempt, setAttempt] = React.useState<number>(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    service
      .getCallerProfile(email)
      .then(({ userScope }) => {
        if (cancelled) return;
        const derived = deriveRole(userScope);
        setRole({ kind: derived.kind, email, displayName, team: derived.team });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || "We couldn't check your access.");
        setRole({ kind: 'employee', email, displayName });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [service, email, displayName, attempt]);

  const retry = React.useCallback(() => setAttempt((n) => n + 1), []);

  return { role, loading, error, retry };
}
