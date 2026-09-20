import * as React from 'react';
import styles from './TicketDetail.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { ITicket } from '../models/ITicket';
import type { IParticipant } from '../models/IParticipant';
import type { IAuditLogEntry } from '../models/IAuditLogEntry';
import type { IUserRole } from '../models/IUserRole';
import { normalizeEmail, TICKET_STATUS } from '../services/config';
import SlaPill from './SlaPill';
import ReassignTab from './tabs/ReassignTab';
import AddPersonTab from './tabs/AddPersonTab';
import ResolveTab from './tabs/ResolveTab';

type TabKey = 'reassign' | 'addPerson' | 'resolve';

export interface ITicketDetailProps {
  service: IOneDeskDataService;
  ticketNumber: string;
  role: IUserRole;
  onBack: () => void;
  /** e.g. "Back to My Tickets" - defaults to "Back to Queue". */
  backLabel?: string;
}

/**
 * Phase 4 screen 3 (build_plan.md), scoped by role in Phase 5: full access
 * (the three action tabs) if the caller's department owns the ticket (or
 * they're an admin); read-only if they raised it or were added to it as a
 * participant; otherwise nothing but the fact that it exists is shown.
 */
const TicketDetail: React.FC<ITicketDetailProps> = ({ service, ticketNumber, role, onBack, backLabel }) => {
  const [ticket, setTicket] = React.useState<ITicket | undefined>(undefined);
  const [participants, setParticipants] = React.useState<IParticipant[]>([]);
  const [auditLog, setAuditLog] = React.useState<IAuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [tab, setTab] = React.useState<TabKey>('reassign');

  const reload = React.useCallback((): void => {
    setError(undefined);
    Promise.all([
      service.getTicketByNumber(ticketNumber),
      service.getParticipants(ticketNumber),
      service.getAuditLog(ticketNumber),
    ])
      .then(([t, p, a]) => {
        setTicket(t);
        setParticipants(p);
        setAuditLog([...a].sort((x, y) => new Date(y.EventTimestamp).getTime() - new Date(x.EventTimestamp).getTime()));
      })
      .catch((err: Error) => setError(err.message || 'Failed to load ticket.'))
      .finally(() => setLoading(false));
  }, [service, ticketNumber]);

  React.useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const ownsTicket = !!ticket && (role.kind === 'admin' || (role.kind === 'staff' && role.team === ticket.CurrentOwnerTeam));
  const isClosed = ticket?.Status === TICKET_STATUS.CLOSED;
  // A department owner/admin can still see a Closed ticket - they just
  // can't act on it (writes refuse it server-side too, see REFUSAL.TICKET_CLOSED).
  const canAct = ownsTicket && !isClosed;
  const isRequester = !!ticket && normalizeEmail(ticket.RequesterEmail) === normalizeEmail(role.email);
  const isParticipant = participants.some((p) => normalizeEmail(p.Email) === normalizeEmail(role.email));
  const canOpen = ownsTicket || isRequester || isParticipant;

  return (
    <section className={styles.detail}>
      <button className={styles.back} onClick={onBack}>
        ← {backLabel || 'Back to Queue'}
      </button>

      {error && <p className={styles.error}>Error: {error}</p>}
      {loading && <p>Loading...</p>}
      {!loading && !error && !ticket && <p>Ticket {ticketNumber} not found.</p>}

      {!loading && !error && ticket && !canOpen && <p className={styles.error}>You don&apos;t have access to {ticketNumber}.</p>}

      {!loading && !error && ticket && canOpen && (
        <>
          <header className={styles.header}>
            <h2 className={styles.heading}>
              {ticket.TicketNumber} - {ticket.Title}
            </h2>
            <SlaPill ticket={ticket} />
          </header>
          <p className={styles.meta}>
            Status: <strong>{ticket.Status}</strong> · Team: <strong>{ticket.CurrentOwnerTeam}</strong> · Priority:{' '}
            <strong>{ticket.Priority}</strong>
          </p>
          {ticket.Description && <p className={styles.description}>{ticket.Description}</p>}

          {canAct ? (
            <>
              <div className={styles.tabs}>
                <button className={tab === 'reassign' ? styles.tabActive : ''} onClick={() => setTab('reassign')}>
                  Reassign
                </button>
                <button className={tab === 'addPerson' ? styles.tabActive : ''} onClick={() => setTab('addPerson')}>
                  Add concerned person
                </button>
                <button className={tab === 'resolve' ? styles.tabActive : ''} onClick={() => setTab('resolve')}>
                  Resolve
                </button>
              </div>

              <div className={styles.tabPanel}>
                {tab === 'reassign' && <ReassignTab service={service} ticket={ticket} role={role} onDone={reload} />}
                {tab === 'addPerson' && <AddPersonTab service={service} ticket={ticket} role={role} onDone={reload} />}
                {tab === 'resolve' && <ResolveTab service={service} ticket={ticket} role={role} onDone={reload} />}
              </div>
            </>
          ) : (
            <p className={styles.readOnlyBanner}>
              Read-only —{' '}
              {isClosed ? 'this ticket is closed.' : isRequester ? 'you raised this ticket.' : 'you were added to this ticket.'}
            </p>
          )}

          <h3 className={styles.sectionHeading}>Participants</h3>
          <ul>
            {participants.map((p) => (
              <li key={p.Id}>
                {p.PersonName} ({p.Email}) - {p.Role}
                {p.Reason ? ` - ${p.Reason}` : ''}
              </li>
            ))}
            {participants.length === 0 && <li>None.</li>}
          </ul>

          <h3 className={styles.sectionHeading}>Audit trail</h3>
          <ul>
            {auditLog.map((a) => (
              <li key={a.Id}>
                {new Date(a.EventTimestamp).toLocaleString()} - {a.ActionType} by {a.PerformedBy}
                {a.Details ? `: ${a.Details}` : ''}
              </li>
            ))}
            {auditLog.length === 0 && <li>None.</li>}
          </ul>
        </>
      )}
    </section>
  );
};

export default TicketDetail;
