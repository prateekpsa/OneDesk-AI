import * as React from 'react';
import styles from './Queue.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { ITicket } from '../models/ITicket';
import { TICKET_STATUS } from '../services/config';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import SlaPill from './SlaPill';

const REFRESH_MS = 15000;
const ALL_STATUSES = 'All';
const STATUS_OPTIONS = [
  ALL_STATUSES,
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

  return (
    <section>
      <div className={styles.filters}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search ticket # or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className={styles.error}>Error: {error}</p>}
      {loading && <p>Loading...</p>}

      {!loading && !error && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ticket #</th>
                <th>Subject</th>
                {!team && <th>Department</th>}
                <th>Status</th>
                <th>Priority</th>
                <th>SLA</th>
                <th>Requester</th>
                <th>Assigned to</th>
              </tr>
            </thead>
            <tbody>
              {visibleTickets.map((t) => (
                <tr key={t.Id} className={styles.row} onClick={() => onSelectTicket(t.TicketNumber)}>
                  <td>{t.TicketNumber}</td>
                  <td>{t.Title}</td>
                  {!team && <td>{t.CurrentOwnerTeam}</td>}
                  <td>{t.Status}</td>
                  <td>{t.Priority}</td>
                  <td>
                    <SlaPill ticket={t} />
                  </td>
                  <td>{t.RequesterEmail}</td>
                  <td>{t.AssignedTo || '-'}</td>
                </tr>
              ))}
              {visibleTickets.length === 0 && (
                <tr>
                  <td colSpan={team ? 7 : 8}>No tickets match.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default Queue;
