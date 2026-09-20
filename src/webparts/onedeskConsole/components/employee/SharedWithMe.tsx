import * as React from 'react';
import styles from './SharedWithMe.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import { normalizeEmail } from '../../services/config';
import SlaPill from '../SlaPill';

export interface ISharedWithMeProps {
  service: IOneDeskDataService;
  email: string;
  onSelectTicket: (ticketNumber: string) => void;
}

interface IRow {
  ticket: ITicket;
  role: string;
}

/**
 * Phase 5 (build_plan.md) - the only way a concerned/watcher/approver
 * reaches a ticket that's neither theirs nor their department's. Excludes
 * tickets they raised themselves, so it never duplicates My Tickets.
 */
const SharedWithMe: React.FC<ISharedWithMeProps> = ({ service, email, onSelectTicket }) => {
  const [rows, setRows] = React.useState<IRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    service
      .getTicketsForParticipant(email)
      .then(async (tickets) => {
        const sharedOnly = tickets.filter((t) => normalizeEmail(t.RequesterEmail) !== normalizeEmail(email));
        const withRoles = await Promise.all(
          sharedOnly.map(async (ticket): Promise<IRow> => {
            const participants = await service.getParticipants(ticket.TicketNumber);
            const mine = participants.find((p) => normalizeEmail(p.Email) === normalizeEmail(email));
            return { ticket, role: mine?.Role || 'Concerned' };
          })
        );
        if (!cancelled) setRows(withRoles);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load shared tickets.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [service, email]);

  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <section>
      <h3 className={styles.heading}>Shared with me</h3>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ticket #</th>
              <th>Subject</th>
              <th>Status</th>
              <th>SLA</th>
              <th>Raised by</th>
              <th>Your role</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ ticket, role }) => (
              <tr key={ticket.Id} className={styles.row} onClick={() => onSelectTicket(ticket.TicketNumber)}>
                <td>{ticket.TicketNumber}</td>
                <td>{ticket.Title}</td>
                <td>{ticket.Status}</td>
                <td>
                  <SlaPill ticket={ticket} />
                </td>
                <td>{ticket.RequesterEmail}</td>
                <td>{role}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6}>Nothing has been shared with you yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SharedWithMe;
