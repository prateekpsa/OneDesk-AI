import * as React from 'react';
import styles from './Tab.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import type { IUserRole } from '../../models/IUserRole';
import { TEAM } from '../../services/config';
import { Select, TextArea, Button, StatusBanner } from '../ui';

const ALL_TEAMS = [TEAM.IT, TEAM.HR, TEAM.ADMIN, TEAM.ANALYTICS, TEAM.FINANCE, TEAM.OTHER];

export interface IReassignTabProps {
  service: IOneDeskDataService;
  ticket: ITicket;
  role: IUserRole;
  onDone: () => void;
}

const ReassignTab: React.FC<IReassignTabProps> = ({ service, ticket, role, onDone }) => {
  const [newTeam, setNewTeam] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string | undefined>(undefined);

  // The ticket's own team can't be a reassignment target - excluded from the
  // list rather than shown and refused at submit time.
  const teamOptions = ALL_TEAMS.filter((t) => t !== ticket.CurrentOwnerTeam);
  const canSubmit = newTeam.length > 0 && reason.trim().length > 0 && !submitting;

  const reset = (): void => {
    setNewTeam('');
    setReason('');
    setMessage(undefined);
  };

  const submit = (): void => {
    setSubmitting(true);
    setMessage(undefined);
    service
      .reassignTicket(ticket.TicketNumber, newTeam, reason.trim(), role.email)
      .then((result) => {
        if (result.success) {
          setMessage(`Reassigned to ${newTeam}.`);
          setNewTeam('');
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
      <p className={styles.description}>
        Moving a ticket changes who owns it. The status stays exactly as it is, and the new desk is posted in their Teams channel.
      </p>

      <Select
        label="Move to"
        value={newTeam}
        onChange={(e) => setNewTeam(e.target.value)}
        options={teamOptions.map((t) => ({ value: t, label: t }))}
        placeholderOption="Choose a department"
        hint={`${ticket.CurrentOwnerTeam} is not listed — a ticket cannot be moved to the desk that already owns it.`}
      />

      <TextArea
        label="Why is it moving?"
        required
        placeholder="Network hardware on 14 is managed by Facilities, not IT."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        hint="The reason is stored on the ticket and shown to the receiving desk."
      />

      <div className={styles.actions}>
        <Button variant="secondary" fullWidth onClick={reset} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="primary" fullWidth disabled={!canSubmit} busy={submitting} onClick={submit}>
          Move ticket
        </Button>
      </div>
      {!canSubmit && !submitting && <span className={styles.hintCenter}>Add a department and a reason to enable this.</span>}

      {message && <StatusBanner tone="info">{message}</StatusBanner>}
    </div>
  );
};

export default ReassignTab;
