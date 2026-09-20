import * as React from 'react';
import styles from './Tab.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import type { IUserRole } from '../../models/IUserRole';
import { TEAM } from '../../services/config';

const TEAMS = [TEAM.IT, TEAM.HR, TEAM.ADMIN, TEAM.ANALYTICS, TEAM.FINANCE, TEAM.OTHER];

export interface IReassignTabProps {
  service: IOneDeskDataService;
  ticket: ITicket;
  role: IUserRole;
  onDone: () => void;
}

const ReassignTab: React.FC<IReassignTabProps> = ({ service, ticket, role, onDone }) => {
  const [newTeam, setNewTeam] = React.useState<string>(ticket.CurrentOwnerTeam);
  const [reason, setReason] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string | undefined>(undefined);

  const canSubmit = reason.trim().length > 0 && newTeam !== ticket.CurrentOwnerTeam && !submitting;

  const submit = (): void => {
    setSubmitting(true);
    setMessage(undefined);
    service
      .reassignTicket(ticket.TicketNumber, newTeam, reason.trim(), role.email)
      .then((result) => {
        if (result.success) {
          setMessage(`Reassigned to ${newTeam}.`);
          setReason('');
          onDone();
        } else {
          setMessage(result.message || 'Reassign refused.');
        }
      })
      .catch((err: Error) => setMessage(err.message))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className={styles.tab}>
      <label>
        New owner team
        <select value={newTeam} onChange={(e) => setNewTeam(e.target.value)}>
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label>
        Reason (required)
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </label>

      <button disabled={!canSubmit} onClick={submit}>
        Reassign
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default ReassignTab;
