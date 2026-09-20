import * as React from 'react';
import styles from './Dashboard.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { IDashboardCounts } from '../models/IDashboardCounts';
import type { IKnowledgeArticle } from '../models/IKnowledgeArticle';
import type { ICommittee } from '../models/ICommittee';
import type { ITicket } from '../models/ITicket';
import { ARTICLE_STATUS, TEAM, TICKET_STATUS } from '../services/config';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getSlaState, slaLabel } from '../utils/slaHelpers';
import {
  PageHeader,
  IconButton,
  Button,
  Pill,
  StatusBanner,
  EmptyState,
  DataTable,
  IDataTableColumn,
  MonoCell,
  TruncatedCell,
  PriorityPill,
  SlaPill,
  SectionHeading,
  Chip,
  Icon,
  TicketPriority,
} from './ui';

const REFRESH_MS = 15000;
const NEEDS_ATTENTION_LIMIT = 5;
const DEPARTMENTS = [TEAM.IT, TEAM.HR, TEAM.ADMIN, TEAM.ANALYTICS, TEAM.FINANCE, TEAM.OTHER];

interface IDepartmentRow {
  department: string;
  counts: IDashboardCounts;
}

const ADMIN_ADDS = [
  'A department scope picker above, and a Department column in the queue whenever the scope is All.',
  "Action tabs on every ticket, not just this desk's — each cross-desk write is stamped “(admin override)” in the history.",
  'User lookup, for answering "what has this person raised?" without opening SharePoint.',
];

const EMPTY_COUNTS: IDashboardCounts = {
  openOnMyTeam: 0,
  newUnassigned: 0,
  pendingEmployeeConfirmation: 0,
  slaBreaching: 0,
  knowledgeDraftsWaiting: 0,
};

export interface IDashboardProps {
  service: IOneDeskDataService;
  /** undefined means "all departments" - the admin view. */
  team?: string;
  /** Jumps to another tab - only the two tabs this screen links into. */
  onNavigate: (view: 'queue' | 'knowledge') => void;
  onSelectTicket: (ticketNumber: string) => void;
  /** Admin only - a "By department" row was clicked; jump to the queue scoped to it. */
  onNavigateToDepartment?: (department: string) => void;
}

function isTerminal(status: string): boolean {
  return status === TICKET_STATUS.CLOSED || status === TICKET_STATUS.RESOLVED || status === TICKET_STATUS.CANCELLED;
}

function relativeTime(seconds: number): string {
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
}

/** Phase 4 screen 1 (build_plan.md) - tile counts, needs-attention tickets, knowledge drafts and committees for the selected team. */
const Dashboard: React.FC<IDashboardProps> = ({ service, team, onNavigate, onSelectTicket, onNavigateToDepartment }) => {
  const [counts, setCounts] = React.useState<IDashboardCounts>(EMPTY_COUNTS);
  const [needsAttention, setNeedsAttention] = React.useState<ITicket[]>([]);
  const [byDepartment, setByDepartment] = React.useState<IDepartmentRow[]>([]);
  const [knowledgeDrafts, setKnowledgeDrafts] = React.useState<IKnowledgeArticle[]>([]);
  const [lockedDraftCount, setLockedDraftCount] = React.useState<number>(0);
  const [committees, setCommittees] = React.useState<ICommittee[]>([]);
  const [selectedCommitteeId, setSelectedCommitteeId] = React.useState<number | undefined>(undefined);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<number>(Date.now());
  const [secondsSinceRefresh, setSecondsSinceRefresh] = React.useState<number>(0);

  const refetch = React.useCallback((): void => {
    setError(undefined);
    Promise.all([
      service.getDashboardCounts(team),
      service.getTickets({ team }),
      // Matches the tile above it, or the two would visibly disagree.
      service.getKnowledgeArticles({ articleStatus: ARTICLE_STATUS.DRAFT, department: team }),
      service.getCommittees(),
      // "All departments" only - the by-department breakdown table. Reuses
      // the same getDashboardCounts a per-team dashboard already calls, once
      // per department, rather than inventing a new aggregate endpoint.
      team === undefined ? Promise.all(DEPARTMENTS.map((d) => service.getDashboardCounts(d))) : Promise.resolve(undefined),
    ])
      .then(async ([dashboardCounts, tickets, drafts, committeeRows, departmentCounts]) => {
        setCounts(dashboardCounts);
        setByDepartment(departmentCounts ? DEPARTMENTS.map((d, i) => ({ department: d, counts: departmentCounts[i] })) : []);

        const sorted = tickets
          .filter((t) => !isTerminal(t.Status) && !!t.SLADueDateTime)
          .sort((a, b) => new Date(a.SLADueDateTime as string).getTime() - new Date(b.SLADueDateTime as string).getTime());
        setNeedsAttention(sorted.slice(0, NEEDS_ATTENTION_LIMIT));

        // A draft whose source ticket isn't Closed yet can't be published -
        // same eligibility check KnowledgeReview makes before showing Publish.
        const withTicket = await Promise.all(
          drafts.map(async (article) => ({
            article,
            ticket: article.SourceTicket ? await service.getTicketByNumber(article.SourceTicket) : undefined,
          }))
        );
        const eligible = withTicket
          .filter(({ article, ticket }) => !article.SourceTicket || ticket?.Status === TICKET_STATUS.CLOSED)
          .map(({ article }) => article);
        setKnowledgeDrafts(eligible);
        setLockedDraftCount(drafts.length - eligible.length);

        setCommittees(committeeRows);
        setLastRefreshedAt(Date.now());
      })
      .catch((err: Error) => setError(err.message || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, [service, team]);

  useAutoRefresh(refetch, REFRESH_MS, [refetch]);

  // Ticks the "Refreshed Ns ago" label between refreshes - display only, no
  // extra service calls.
  React.useEffect(() => {
    const id = window.setInterval(() => setSecondsSinceRefresh(Math.round((Date.now() - lastRefreshedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [lastRefreshedAt]);

  const activeCommittee = React.useMemo(
    () => committees.find((c) => c.Id === selectedCommitteeId) ?? committees[0],
    [committees, selectedCommitteeId]
  );

  const columns: Array<IDataTableColumn<ITicket>> = [
    { key: 'number', header: 'Ticket #', width: '148px', isRowHeader: true, render: (t) => <MonoCell>{t.TicketNumber}</MonoCell> },
    { key: 'subject', header: 'Subject', width: 'auto', render: (t) => <TruncatedCell title={t.Title}>{t.Title}</TruncatedCell> },
    { key: 'priority', header: 'Priority', width: '110px', render: (t) => <PriorityPill priority={t.Priority as TicketPriority} /> },
    { key: 'sla', header: 'SLA', width: '110px', render: (t) => <SlaPill state={getSlaState(t)} label={slaLabel(t)} /> },
  ];

  const departmentColumns: Array<IDataTableColumn<IDepartmentRow>> = [
    { key: 'department', header: 'Department', width: 'auto', isRowHeader: true, render: (r) => r.department },
    { key: 'open', header: 'Open', width: '76px', render: (r) => r.counts.openOnMyTeam },
    { key: 'new', header: 'New', width: '76px', render: (r) => r.counts.newUnassigned },
    { key: 'employee', header: 'With employee', width: '116px', render: (r) => r.counts.pendingEmployeeConfirmation },
    {
      key: 'breached',
      header: 'Breached',
      width: '92px',
      render: (r) => (
        <Pill tone={r.counts.slaBreaching > 0 ? 'danger' : 'neutral'} size="sm">
          {r.counts.slaBreaching}
        </Pill>
      ),
    },
    { key: 'drafts', header: 'Drafts', width: '84px', render: (r) => r.counts.knowledgeDraftsWaiting },
  ];

  return (
    <section className={styles.dashboard}>
      <PageHeader
        title="Dashboard"
        subtitle={`Everything below is scoped to ${team ? `the ${team} desk` : 'all departments'}.`}
        actions={
          <>
            <span className={styles.refreshedAt}>Refreshed {relativeTime(secondsSinceRefresh)}</span>
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
              <span className={styles.tileLabel}>Open on {team || 'all departments'}</span>
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

          {team === undefined ? (
            <div className={styles.body}>
              <section className={styles.needsAttention}>
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
                  onRowSelect={onNavigateToDepartment ? (r) => onNavigateToDepartment(r.department) : undefined}
                  empty={<EmptyState title="No departments found" />}
                />
              </section>

              <div className={styles.sidebar}>
                <section className={styles.panel}>
                  <SectionHeading>What admin adds</SectionHeading>
                  <ul className={styles.adminAddsList}>
                    {ADMIN_ADDS.map((text) => (
                      <li key={text} className={styles.adminAddsItem}>
                        <Icon name="check" size={15} strokeWidth={2.4} className={styles.adminAddsIcon} />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          ) : (
            <div className={styles.body}>
              <section className={styles.needsAttention}>
                <div className={styles.panelHeader}>
                  <div className={styles.panelTitleBlock}>
                    <h2 className={styles.panelTitle}>Needs you first</h2>
                    <span className={styles.panelSubtitle}>Breached, then closest to breaching.</span>
                  </div>
                  <Button variant="quiet" size="sm" onClick={() => onNavigate('queue')}>
                    See all {counts.openOnMyTeam}
                  </Button>
                </div>
                <DataTable
                  caption="Tickets needing attention first"
                  columns={columns}
                  rows={needsAttention}
                  rowKey={(t) => t.TicketNumber}
                  onRowSelect={(t) => onSelectTicket(t.TicketNumber)}
                  empty={<EmptyState title="Nothing urgent right now" description="No open ticket is close to breaching its SLA." />}
                />
              </section>

              <div className={styles.sidebar}>
                <section className={styles.panel}>
                  <SectionHeading
                    aside={
                      <Button variant="quiet" size="sm" onClick={() => onNavigate('knowledge')}>
                        Review
                      </Button>
                    }
                  >
                    Knowledge drafts
                  </SectionHeading>
                  {knowledgeDrafts.length === 0 && lockedDraftCount === 0 ? (
                    <EmptyState title="No knowledge drafts waiting" description="Drafts appear here once a resolved ticket is marked reusable." />
                  ) : (
                    <div className={styles.draftList}>
                      {knowledgeDrafts.map((a) => (
                        <button key={a.Id} type="button" className={styles.draftItem} onClick={() => onNavigate('knowledge')}>
                          <span className={styles.draftTitle}>{a.Title}</span>
                          <span className={styles.draftMeta}>{a.SourceTicket ? `From ${a.SourceTicket}` : 'No source ticket'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {lockedDraftCount > 0 && (
                    <StatusBanner tone="warn">
                      {lockedDraftCount} draft{lockedDraftCount === 1 ? ' is' : 's are'} locked — its source ticket is still open.
                    </StatusBanner>
                  )}
                </section>

                <section className={styles.panel}>
                  <SectionHeading aside={<span className={styles.panelSubtitle}>Who to contact</span>}>Committees</SectionHeading>
                  {committees.length === 0 ? (
                    <EmptyState title="No committees found" />
                  ) : (
                    <>
                      <div className={styles.chipRow}>
                        {committees.map((c) => (
                          <Chip key={c.Id} selected={activeCommittee?.Id === c.Id} onClick={() => setSelectedCommitteeId(c.Id)}>
                            {c.CommitteeName}
                          </Chip>
                        ))}
                      </div>
                      {activeCommittee && (
                        <>
                          <div className={styles.divider} />
                          <div className={styles.committeeDetail}>
                            <span className={styles.committeeName}>
                              {activeCommittee.CommitteeName}
                              {activeCommittee.Description ? ` · ${activeCommittee.Description}` : ''}
                            </span>
                            {activeCommittee.CoordinatorEmail || activeCommittee.ContactEmail ? (
                              <span className={styles.committeeContact}>
                                Contact{' '}
                                <a href={`mailto:${activeCommittee.CoordinatorEmail || activeCommittee.ContactEmail}`}>
                                  {activeCommittee.CoordinatorEmail || activeCommittee.ContactEmail}
                                </a>
                              </span>
                            ) : (
                              <span className={styles.committeeContact}>No contact on file.</span>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default Dashboard;
