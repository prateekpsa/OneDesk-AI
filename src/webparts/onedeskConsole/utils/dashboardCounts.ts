import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { IDashboardCounts } from '../models/IDashboardCounts';

const EMPTY: IDashboardCounts = {
  openOnMyTeam: 0,
  newUnassigned: 0,
  pendingEmployeeConfirmation: 0,
  slaBreaching: 0,
  knowledgeDraftsWaiting: 0,
};

function sum(a: IDashboardCounts, b: IDashboardCounts): IDashboardCounts {
  return {
    openOnMyTeam: a.openOnMyTeam + b.openOnMyTeam,
    newUnassigned: a.newUnassigned + b.newUnassigned,
    pendingEmployeeConfirmation: a.pendingEmployeeConfirmation + b.pendingEmployeeConfirmation,
    slaBreaching: a.slaBreaching + b.slaBreaching,
    knowledgeDraftsWaiting: a.knowledgeDraftsWaiting + b.knowledgeDraftsWaiting,
  };
}

/**
 * getDashboardCounts only ever scopes to one department or all of them - it
 * has no multi-team parameter. For an admin's multi-select scope that's
 * neither (2 of 5 departments, say), this sums the same per-department call
 * the "by department" table already makes rather than inventing a new
 * aggregate service method.
 */
export function getScopedDashboardCounts(
  service: IOneDeskDataService,
  teams: string[] | undefined
): Promise<IDashboardCounts> {
  if (!teams || teams.length === 0) return service.getDashboardCounts(undefined);
  if (teams.length === 1) return service.getDashboardCounts(teams[0]);
  return Promise.all(teams.map((t) => service.getDashboardCounts(t))).then((all) => all.reduce(sum, EMPTY));
}
