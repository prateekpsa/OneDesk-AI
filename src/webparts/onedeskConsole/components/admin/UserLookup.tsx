import * as React from 'react';
import styles from './UserLookup.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import { deriveRole } from '../../services/config';
import SlaPill from '../SlaPill';

export interface IUserLookupProps {
  service: IOneDeskDataService;
  onSelectTicket: (ticketNumber: string) => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ticketTable(tickets: ITicket[], emptyText: string, onSelectTicket: (ticketNumber: string) => void): JSX.Element {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Ticket #</th>
          <th>Subject</th>
          <th>Status</th>
          <th>SLA</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => (
          <tr key={t.Id} className={styles.row} onClick={() => onSelectTicket(t.TicketNumber)}>
            <td>{t.TicketNumber}</td>
            <td>{t.Title}</td>
            <td>{t.Status}</td>
            <td>
              <SlaPill ticket={t} />
            </td>
          </tr>
        ))}
        {tickets.length === 0 && (
          <tr>
            <td colSpan={4}>{emptyText}</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/** Phase 5 (build_plan.md), admin only - look up any person's department/role and their tickets. */
const UserLookup: React.FC<IUserLookupProps> = ({ service, onSelectTicket }) => {
  const [email, setEmail] = React.useState<string>('');
  const [searching, setSearching] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [scopeLabel, setScopeLabel] = React.useState<string | undefined>(undefined);
  const [raised, setRaised] = React.useState<ITicket[] | undefined>(undefined);
  const [shared, setShared] = React.useState<ITicket[] | undefined>(undefined);

  const search = (): void => {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setSearching(true);
    setError(undefined);
    setRaised(undefined);
    setShared(undefined);

    Promise.all([service.getCallerProfile(trimmed), service.getTickets({ requesterEmail: trimmed }), service.getTicketsForParticipant(trimmed)])
      .then(([profile, raisedTickets, sharedTickets]) => {
        const role = deriveRole(profile.userScope);
        setScopeLabel(
          role.kind === 'admin'
            ? 'Super Admin'
            : role.kind === 'staff'
            ? `${role.team} team`
            : 'Not in StaffDirectory - treated as an employee'
        );
        setRaised(raisedTickets);
        setShared(sharedTickets.filter((t) => t.RequesterEmail.toLowerCase() !== trimmed.toLowerCase()));
      })
      .catch((err: Error) => setError(err.message || 'Lookup failed.'))
      .finally(() => setSearching(false));
  };

  return (
    <section>
      <h3 className={styles.heading}>User lookup</h3>

      <div className={styles.searchRow}>
        <input
          type="email"
          placeholder="person@preferredsquare.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <button disabled={searching} onClick={search}>
          Search
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {scopeLabel && (
        <>
          <p className={styles.card}>
            <strong>{email.trim()}</strong> — {scopeLabel}
          </p>

          <h4 className={styles.sectionHeading}>Raised by this person</h4>
          {raised && ticketTable(raised, 'No tickets found for that address.', onSelectTicket)}

          <h4 className={styles.sectionHeading}>Shared with this person</h4>
          {shared && ticketTable(shared, 'Nothing has been shared with this person.', onSelectTicket)}
        </>
      )}
    </section>
  );
};

export default UserLookup;
