import * as React from 'react';
import styles from './Dashboard.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { IDashboardCounts } from '../models/IDashboardCounts';
import type { ITicket } from '../models/ITicket';
import { PRIORITY, TEAM, TICKET_STATUS } from '../services/config';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRefreshedLabel } from '../hooks/useRefreshedLabel';
import { getAgeInDays } from '../utils/slaHelpers';
import { getScopedDashboardCounts } from '../utils/dashboardCounts';
import {
  PageHeader,
  IconButton,
  Button,
  Pill,
  StatusBanner,
  EmptyState,
  DataTable,
  IDataTableColumn,
  BarRow,
  PriorityPill,
  TicketPriority,
} from './ui';

const REFRESH_MS = 15000;
const DEPARTMENTS = [TEAM.IT, TEAM.HR, TEAM.ADMIN, TEAM.ANALYTICS, TEAM.FINANCE, TEAM.OTHER];

/** Display order for the "by priority" breakdown — most urgent first. */
const PRIORITY_ORDER: TicketPriority[] = [PRIORITY.CRITICAL, PRIORITY.HIGH, PRIORITY.MEDIUM, PRIORITY.LOW];

/** Every status but Closed - what the "Open" tile and "Open" department-table column both count. */
const OPEN_STATUSES = [
  TICKET_STATUS.NEW,
  TICKET_STATUS.ASSIGNED,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.PENDING_EMPLOYEE_CONFIRMATION,
  TICKET_STATUS.RESOLVED,
  TICKET_STATUS.REOPENED,
  TICKET_STATUS.CANCELLED,
];

/**
 * Non-overlapping age buckets for "how long they have been open". A ticket
 * with no TicketCreatedDate (getAgeInDays returns undefined) lands in none of
 * them, the same way a ticket with no SLADueDateTime shows in none of the SLA
 * tallies rather than being guessed into one.
 */
const AGE_BUCKETS: Array<{ key: string; label: string; test: (age: number) => boolean }> = [
  { key: 'under24h', label: 'Under 24h', test: (age) => age === 0 },
  { key: 'oneToThree', label: '1 to 3 days', test: (age) => age >= 1 && age <= 3 },
  { key: 'fourToSeven', label: '4 to 7 days', test: (age) => age >= 4 && age <= 7 },
  { key: 'overSeven', label: 'Over 7 days', test: (age) => age >= 8 },
];

interface IDepartmentRow {
  department: string;
  counts: IDashboardCounts;
}

const EMPTY_COUNTS: IDashboardCounts = {
  openOnMyTeam: 0,
  newUnassigned: 0,
  pendingEmployeeConfirmation: 0,
  slaBreaching: 0,
  knowledgeDraftsWaiting: 0,
};

/** What clicking a "by department" row/number means - which screen, scoped to which department, filtered how. */
export interface IDashboardDrillDown {
  department: string;
  view: 'queue' | 'knowledge';
  statuses?: string[];
  slaBreached?: boolean;
}

export interface IDashboardProps {
  service: IOneDeskDataService;
  /** undefined/empty means "all departments" - the admin view. */
  team?: string[];
  /** Jumps to another tab - only the two tabs this screen links into. */
  onNavigate: (view: 'queue' | 'knowledge') => void;
  /** Admin only - a "By department" cell was clicked; jump to the target screen scoped and filtered accordingly. */
  onNavigateToDepartment?: (drill: IDashboardDrillDown) => void;
}

function isTerminal(status: string): boolean {
  return status === TICKET_STATUS.CLOSED || status === TICKET_STATUS.RESOLVED || status === TICKET_STATUS.CANCELLED;
}

function scopeLabel(team: string[] | undefined): string {
  if (!team || team.length === 0) return 'all departments';
  if (team.length === 1) return `the ${team[0]} desk`;
  return `${team.length} departments`;
}

/** Phase 4 screen 1 (build_plan.md) - tile counts, a by-department breakdown, and the priority/age breakdown for the selected scope. */
const Dashboard: React.FC<IDashboardProps> = ({ service, team, onNavigate, onNavigateToDepartment }) => {
  const [counts, setCounts] = React.useState<IDashboardCounts>(EMPTY_COUNTS);
  const [openTickets, setOpenTickets] = React.useState<ITicket[]>([]);
  const [byDepartment, setByDepartment] = React.useState<IDepartmentRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<number>(Date.now());
  const refreshedLabel = useRefreshedLabel(lastRefreshedAt);

  // Anything other than exactly one department benefits from a breakdown -
  // "all departments" and "these 3 departments" both do, a single desk
  // doesn't (it would just repeat the tiles above it).
  const showByDepartment = !team || team.length !== 1;
  const departmentsToShow = team && team.length > 0 ? team : DEPARTMENTS;

  const refetch = React.useCallback((): void => {
    setError(undefined);
    Promise.all([
      getScopedDashboardCounts(service, team),
      service.getTickets({ team }),
      // Reuses the same getDashboardCounts a single-department dashboard
      // already calls, once per department in scope, rather than inventing a
      // new aggregate endpoint.
      showByDepartment ? Promise.all(departmentsToShow.map((d) => service.getDashboardCounts(d))) : Promise.resolve(undefined),
    ])
      .then(([dashboardCounts, tickets, departmentCounts]) => {
        setCounts(dashboardCounts);
        setByDepartment(departmentCounts ? departmentsToShow.map((d, i) => ({ department: d, counts: departmentCounts[i] })) : []);
        setOpenTickets(tickets.filter((t) => !isTerminal(t.Status)));
        setLastRefreshedAt(Date.now());
      })
      .catch((err: Error) => setError(err.message || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service, team]);

  useAutoRefresh(refetch, REFRESH_MS, [refetch]);

  const priorityBuckets = React.useMemo(
    () => PRIORITY_ORDER.map((priority) => ({ priority, count: openTickets.filter((t) => t.Priority === priority).length })),
    [openTickets]
  );
  const maxPriorityCount = Math.max(1, ...priorityBuckets.map((b) => b.count));

  const ageBuckets = React.useMemo(() => {
    const ages = openTickets.map(getAgeInDays).filter((age): age is number => age !== undefined);
    return AGE_BUCKETS.map((bucket) => ({ ...bucket, count: ages.filter(bucket.test).length }));
  }, [openTickets]);
  const maxAgeCount = Math.max(1, ...ageBuckets.map((b) => b.count));

  const drillToQueue = (department: string, statuses?: string[], slaBreached?: boolean): ((e: React.MouseEvent) => void) => (e) => {
    e.stopPropagation();
    onNavigateToDepartment?.({ department, view: 'queue', statuses, slaBreached });
  };
  const drillToKnowledge = (department: string): ((e: React.MouseEvent) => void) => (e) => {
    e.stopPropagation();
    onNavigateToDepartment?.({ department, view: 'knowledge' });
  };

  function countCell(value: number, onClick: ((e: React.MouseEvent) => void) | undefined): React.ReactNode {
    if (!onClick) return value;
    return (
      <button type="button" className={styles.cellLink} onClick={onClick}>
        {value}
      </button>
    );
  }

  const departmentColumns: Array<IDataTableColumn<IDepartmentRow>> = [
    { key: 'department', header: 'Department', width: 'auto', isRowHeader: true, render: (r) => r.department },
    {
      key: 'open',
      header: 'Open',
      width: '90px',
      render: (r) => countCell(r.counts.openOnMyTeam, onNavigateToDepartment && drillToQueue(r.department, OPEN_STATUSES)),
    },
    {
      key: 'new',
      header: 'New',
      width: '90px',
      render: (r) => countCell(r.counts.newUnassigned, onNavigateToDepartment && drillToQueue(r.department, [TICKET_STATUS.NEW])),
    },
    {
      key: 'employee',
      header: 'With employee',
      width: '130px',
      render: (r) =>
        countCell(
          r.counts.pendingEmployeeConfirmation,
          onNavigateToDepartment && drillToQueue(r.department, [TICKET_STATUS.PENDING_EMPLOYEE_CONFIRMATION])
        ),
    },
    {
      key: 'breached',
      header: 'Breached',
      width: '100px',
      render: (r) => {
        const pill = (
          <Pill tone={r.counts.slaBreaching > 0 ? 'danger' : 'neutral'} size="sm">
            {r.counts.slaBreaching}
          </Pill>
        );
        if (!onNavigateToDepartment) return pill;
        return (
          <button type="button" className={styles.cellLinkReset} onClick={drillToQueue(r.department, undefined, true)}>
            {pill}
          </button>
        );
      },
    },
    {
      key: 'drafts',
      header: 'Drafts',
      width: '90px',
      render: (r) => countCell(r.counts.knowledgeDraftsWaiting, onNavigateToDepartment && drillToKnowledge(r.department)),
    },
  ];

  return (
    <section className={styles.dashboard}>
      <PageHeader
        title="Dashboard"
        subtitle={`Everything below is scoped to ${scopeLabel(team)}.`}
        actions={
          <>
            <span className={styles.refreshedAt}>{refreshedLabel}</span>
            <IconButton icon="refresh" label="Refresh the dashboard" onClick={refetch} />
            <Button variant="primary" onClick={() => onNavigate('queue')}>
              Open the queue
            </Button>
          </>
        }
      />

      {error && <StatusBanner tone="danger">{error}</StatusBanner>}
      {!error && loading && <p className={styles.loading}>Loading…</p>}

      {!error && !loading && (
        <>
          <div className={styles.tiles}>
            <button type="button" className={styles.tile} onClick={() => onNavigate('queue')}>
              <span className={styles.tileLabel}>Open on {team && team.length === 1 ? team[0] : 'all departments'}</span>
              <span className={styles.tileValue}>{counts.openOnMyTeam}</span>
              <span className={styles.tileCaption}>Currently open</span>
            </button>
            <button type="button" className={styles.tile} onClick={() => onNavigate('queue')}>
              <span className={styles.tileLabel}>New, unassigned</span>
              <span className={styles.tileValue}>{counts.newUnassigned}</span>
              <span className={styles.tileCaption}>Waiting to be picked up</span>
            </button>
            <button type="button" className={styles.tile} onClick={() => onNavigate('queue')}>
              <span className={styles.tileLabel}>With the employee</span>
              <span className={styles.tileValue}>{counts.pendingEmployeeConfirmation}</span>
              <span className={styles.tileCaption}>Awaiting their confirmation</span>
            </button>
            <button
              type="button"
              className={`${styles.tile} ${counts.slaBreaching > 0 ? styles.tileDanger : ''}`}
              onClick={() => onNavigate('queue')}
            >
              <span className={styles.tileLabel}>SLA breached</span>
              <span className={styles.tileValue}>{counts.slaBreaching}</span>
              <span className={styles.tileCaption}>Needs attention now</span>
            </button>
            <button type="button" className={styles.tile} onClick={() => onNavigate('knowledge')}>
              <span className={styles.tileLabel}>Knowledge drafts</span>
              <span className={styles.tileValue}>{counts.knowledgeDraftsWaiting}</span>
              <span className={styles.tileCaption}>Waiting for review</span>
            </button>
          </div>

          {showByDepartment && (
            <section className={styles.byDepartment}>
              <div className={styles.panelHeader}>
                <div className={styles.panelTitleBlock}>
                  <h2 className={styles.panelTitle}>By department</h2>
                  <span className={styles.panelSubtitle}>Where the load actually sits right now.</span>
                </div>
                <Button variant="quiet" size="sm" onClick={() => onNavigate('queue')}>
                  Open the full queue
                </Button>
              </div>
              <DataTable
                caption="Ticket counts by department"
                columns={departmentColumns}
                rows={byDepartment}
                rowKey={(r) => r.department}
                onRowSelect={onNavigateToDepartment ? (r) => onNavigateToDepartment({ department: r.department, view: 'queue' }) : undefined}
                empty={<EmptyState title="No departments found" />}
              />
            </section>
          )}

          <div className={styles.breakdowns}>
            <section className={styles.panel}>
              <div className={styles.panelTitleBlock}>
                <h2 className={styles.panelTitle}>Those {openTickets.length}, by priority</h2>
                <span className={styles.panelSubtitle}>
                  {team && team.length === 1
                    ? 'What you are actually holding.'
                    : team && team.length > 1
                    ? 'Across the selected desks.'
                    : 'Across every desk.'}
                </span>
              </div>
              <div className={styles.barRows}>
                {priorityBuckets.map((b) => (
                  <BarRow
                    key={b.priority}
                    label={<PriorityPill priority={b.priority} />}
                    value={b.count}
                    max={maxPriorityCount}
                    labelWidth={78}
                  />
                ))}
              </div>
              <span className={styles.panelFooter}>Critical answers in 4 hours, High in 8, Medium in 24, Low in 48.</span>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelTitleBlock}>
                <h2 className={styles.panelTitle}>How long they have been open</h2>
                <span className={styles.panelSubtitle}>
                  {team && team.length === 1
                    ? 'Age since raised, not since last touched.'
                    : team && team.length > 1
                    ? 'Age since raised, across the selected desks.'
                    : 'Age since raised, across every desk.'}
                </span>
              </div>
              <div className={styles.barRows}>
                {ageBuckets.map((b) => (
                  <BarRow
                    key={b.key}
                    label={
                      <span className={b.key === 'overSeven' ? styles.ageLabelDanger : styles.ageLabel}>{b.label}</span>
                    }
                    value={b.count}
                    max={maxAgeCount}
                    tone={b.key === 'overSeven' ? 'danger' : 'default'}
                    labelWidth={88}
                  />
                ))}
              </div>
              <span className={styles.panelFooter}>Anything over a week is worth a look even when its SLA says it is fine.</span>
            </section>
          </div>
        </>
      )}
    </section>
  );
};

export default Dashboard;
