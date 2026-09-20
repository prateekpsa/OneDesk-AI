import * as React from 'react';
import styles from './Queue.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { ITicket } from '../models/ITicket';
import { TICKET_STATUS } from '../services/config';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { getSlaState, slaLabel } from '../utils/slaHelpers';
import {
  PageHeader,
  Select,
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
} from './ui';

const REFRESH_MS = 15000;
const ALL_STATUSES = 'All';
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

export interface IQueueProps {
  service: IOneDeskDataService;
  /** undefined means "all departments" - the admin view, which also shows a Department column. */
  team?: string;
  onSelectTicket: (ticketNumber: string) => void;
}

function lastModified(ticket: ITicket): number {
  return new Date(ticket.Modified || ticket.TicketCreatedDate || 0).getTime();
}

/** Phase 4 screen 2 (build_plan.md) - status filter + text search over the team's tickets, newest activity first. */
const Queue: React.FC<IQueueProps> = ({ service, team, onSelectTicket }) => {
  const [status, setStatus] = React.useState<string>(ALL_STATUSES);
  const [search, setSearch] = React.useState<string>('');
  const [tickets, setTickets] = React.useState<ITicket[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const refetch = React.useCallback((): void => {
    setError(undefined);
    service
      .getTickets({ team, status: status === ALL_STATUSES ? undefined : status })
      .then((rows) => setTickets(rows))
      .catch((err: Error) => setError(err.message || 'Failed to load the queue.'))
      .finally(() => setLoading(false));
  }, [service, team, status]);

  useAutoRefresh(refetch, REFRESH_MS, [refetch]);

  const visibleTickets = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? tickets.filter((t) => t.TicketNumber.toLowerCase().includes(term) || t.Title.toLowerCase().includes(term))
      : tickets;
    return [...filtered].sort((a, b) => lastModified(b) - lastModified(a));
  }, [tickets, search]);

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
      hidden: !!team,
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
      <PageHeader title="Queue" subtitle={`${team ? `${team} desk` : 'All departments'} · sorted by most recently updated`} />

      <div className={styles.toolbar}>
        <SearchInput
          className={styles.search}
          label="Search ticket # or subject"
          placeholder="Ticket number or subject"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          className={styles.statusSelect}
          label="Status"
          labelHidden
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
          placeholderOption={`All statuses`}
        />
        <div className={styles.toolbarSpacer} />
        <span className={styles.autoRefresh}>Auto-refresh every 15s</span>
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
          empty={<EmptyState title="No tickets match" description="Try clearing the status filter or search." />}
          footer={<span>Showing {visibleTickets.length} tickets · closed tickets stay visible and read-only</span>}
        />
      )}
    </section>
  );
};

export default Queue;
