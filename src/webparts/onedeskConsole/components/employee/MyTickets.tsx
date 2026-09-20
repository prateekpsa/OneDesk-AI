import * as React from 'react';
import styles from './MyTickets.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import SlaPill from '../SlaPill';

const REFRESH_MS = 15000;

export interface IMyTicketsProps {
  service: IOneDeskDataService;
  requesterEmail: string;
  onSelectTicket: (ticketNumber: string) => void;
}

function createdDesc(a: ITicket, b: ITicket): number {
  return new Date(b.TicketCreatedDate || 0).getTime() - new Date(a.TicketCreatedDate || 0).getTime();
}

/** Phase 6 (build_plan.md) - read-only list of tickets the signed-in employee raised. */
const MyTickets: React.FC<IMyTicketsProps> = ({ service, requesterEmail, onSelectTicket }) => {
  const [tickets, setTickets] = React.useState<ITicket[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const refetch = React.useCallback((): void => {
    setError(undefined);
    service
      .getTickets({ requesterEmail })
      .then((rows) => setTickets([...rows].sort(createdDesc)))
      .catch((err: Error) => setError(err.message || 'Failed to load your tickets.'))
      .finally(() => setLoading(false));
  }, [service, requesterEmail]);

  useAutoRefresh(refetch, REFRESH_MS, [refetch]);

  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <section>
      <h3 className={styles.heading}>My tickets</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Priority</th>
            <th>SLA</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.Id} className={styles.row} onClick={() => onSelectTicket(t.TicketNumber)}>
              <td>{t.TicketNumber}</td>
              <td>{t.Title}</td>
              <td>{t.Status}</td>
              <td>{t.Priority}</td>
              <td>
                <SlaPill ticket={t} />
              </td>
            </tr>
          ))}
          {tickets.length === 0 && (
            <tr>
              <td colSpan={5}>You haven&apos;t raised any tickets yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
};

export default MyTickets;
