import * as React from 'react';
import styles from './Queue.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { ITicket } from '../models/ITicket';
import { TICKET_STATUS } from '../services/config';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { useRefreshedLabel } from '../hooks/useRefreshedLabel';
import { getSlaState, slaLabel } from '../utils/slaHelpers';
import {
  PageHeader,
  MultiSelect,
  SearchInput,
  IconButton,
  DataTable,
  IDataTableColumn,
  MonoCell,
  TruncatedCell,
  StatusPill,
  PriorityPill,
  SlaPill,
  EmptyState,
  StatusBanner,
  TicketStatus,
  TicketPriority,
  SlaState,
} from './ui';

const REFRESH_MS = 15000;
const STATUS_OPTIONS = [
  TICKET_STATUS.NEW,
  TICKET_STATUS.ASSIGNED,
  TICKET_STATUS.IN_PROGRESS,
  TICKET_STATUS.PENDING_EMPLOYEE_CONFIRMATION,
  TICKET_STATUS.RESOLVED,
  TICKET_STATUS.REOPENED,
  TICKET_STATUS.CLOSED,
  TICKET_STATUS.CANCELLED,
];
const SLA_OPTIONS: Array<{ value: SlaState; label: string }> = [
  { value: 'breached', label: 'Breached' },
  { value: 'dueSoon', label: 'Due soon' },
  { value: 'onTrack', label: 'On track' },
];

export interface IQueueProps {
  service: IOneDeskDataService;
  /** undefined/empty means "all departments" - the admin view, which also shows a Department column. */
  team?: string[];
  onSelectTicket: (ticketNumber: string) => void;
  /** Pre-applied when arriving from a dashboard drill-down; the user can still change either afterwards. */
  initialStatuses?: string[];
  initialSlaBreached?: boolean;
}

function lastModified(ticket: ITicket): number {
  return new Date(ticket.Modified || ticket.TicketCreatedDate || 0).getTime();
}

function teamSubtitle(team: string[] | undefined): string {
  if (!team || team.length === 0) return 'All departments';
  if (team.length === 1) return `${team[0]} desk`;
  return `${team.length} departments`;
}

/** Phase 4 screen 2 (build_plan.md) - status/SLA filters + text search over the team's tickets, newest activity first. */
const Queue: React.FC<IQueueProps> = ({ service, team, onSelectTicket, initialStatuses, initialSlaBreached }) => {
  const [statuses, setStatuses] = React.useState<string[]>(() => initialStatuses ?? []);
  const [slaStates, setSlaStates] = React.useState<string[]>(() => (initialSlaBreached ? ['breached'] : []));
  const [search, setSearch] = React.useState<string>('');
  const [tickets, setTickets] = React.useState<ITicket[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [lastRefreshedAt, setLastRefreshedAt] = React.useState<number>(Date.now());
  const refreshedLabel = useRefreshedLabel(lastRefreshedAt);

  const refetch = React.useCallback((): void => {
    setError(undefined);
    service
      .getTickets({ team, status: statuses.length > 0 ? statuses : undefined })
      .then((rows) => {
        setTickets(rows);
        setLastRefreshedAt(Date.now());
      })
      .catch((err: Error) => setError(err.message || 'Failed to load the queue.'))
      .finally(() => setLoading(false));
  }, [service, team, statuses]);

  useAutoRefresh(refetch, REFRESH_MS, [refetch]);

  const visibleTickets = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    let filtered = term
      ? tickets.filter((t) => t.TicketNumber.toLowerCase().includes(term) || t.Title.toLowerCase().includes(term))
      : tickets;
    if (slaStates.length > 0) filtered = filtered.filter((t) => slaStates.indexOf(getSlaState(t)) !== -1);
    return [...filtered].sort((a, b) => {
      // Closed tickets are done - they read as background noise at the top
      // of a list someone's trying to work from, so they always sink to the
      // bottom regardless of how recently they were touched.
      const aClosed = a.Status === TICKET_STATUS.CLOSED;
      const bClosed = b.Status === TICKET_STATUS.CLOSED;
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      return lastModified(b) - lastModified(a);
    });
  }, [tickets, search, slaStates]);

  const columns: Array<IDataTableColumn<ITicket>> = [
    {
      key: 'number',
      header: 'Ticket #',
      width: '152px',
      isRowHeader: true,
      render: (t) => <MonoCell>{t.TicketNumber}</MonoCell>,
    },
    {
      key: 'subject',
      header: 'Subject',
      width: 'auto',
      render: (t) => <TruncatedCell title={t.Title}>{t.Title}</TruncatedCell>,
    },
    {
      key: 'department',
      header: 'Department',
      width: '120px',
      // A single-department scope makes every row the same department; a
      // multi-department (or all-departments) scope is exactly when this
      // column earns its place.
      hidden: !!team && team.length === 1,
      render: (t) => t.CurrentOwnerTeam,
    },
    {
      key: 'priority',
      header: 'Priority',
      width: '92px',
      render: (t) => <PriorityPill priority={t.Priority as TicketPriority} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '176px',
      render: (t) => <StatusPill status={t.Status as TicketStatus} />,
    },
    {
      key: 'sla',
      header: 'SLA',
      width: '108px',
      render: (t) => <SlaPill state={getSlaState(t)} label={slaLabel(t)} />,
    },
    {
      key: 'requester',
      header: 'Requester',
      width: '200px',
      render: (t) => <TruncatedCell title={t.RequesterEmail}>{t.RequesterEmail}</TruncatedCell>,
    },
    {
      key: 'assignedTo',
      header: 'Assigned to',
      width: '160px',
      render: (t) => t.AssignedTo || '—',
    },
  ];

  return (
    <section className={styles.queue}>
      <PageHeader title="Queue" subtitle={`${teamSubtitle(team)} · sorted by most recently updated, closed last`} />

      <div className={styles.toolbar}>
        <SearchInput
          className={styles.search}
          label="Search ticket # or subject"
          placeholder="Ticket number or subject"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <MultiSelect
          className={styles.statusSelect}
          label="Status"
          labelHidden
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          selected={statuses}
          onChange={setStatuses}
          allLabel="All statuses"
        />
        <MultiSelect
          className={styles.slaSelect}
          label="SLA"
          labelHidden
          options={SLA_OPTIONS}
          selected={slaStates}
          onChange={setSlaStates}
          allLabel="All SLA states"
        />
        <div className={styles.toolbarSpacer} />
        <span className={styles.autoRefresh}>{refreshedLabel}</span>
        <IconButton icon="refresh" label="Refresh the queue" size="md" onClick={refetch} />
      </div>

      {error && <StatusBanner tone="danger">{error}</StatusBanner>}

      {!error && (
        <DataTable
          caption={`Queue, ${visibleTickets.length} tickets`}
          columns={columns}
          rows={visibleTickets}
          rowKey={(t) => t.TicketNumber}
          onRowSelect={(t) => onSelectTicket(t.TicketNumber)}
          loading={loading}
          empty={<EmptyState title="No tickets match" description="Try clearing a filter or the search." />}
          footer={<span>Showing {visibleTickets.length} tickets · closed tickets stay visible and read-only</span>}
        />
      )}
    </section>
  );
};

export default Queue;
