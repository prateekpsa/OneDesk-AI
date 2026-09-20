import * as React from 'react';
import styles from './Tab.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import type { IUserRole } from '../../models/IUserRole';
import { TICKET_STATUS } from '../../services/config';

export interface IResolveTabProps {
  service: IOneDeskDataService;
  ticket: ITicket;
  role: IUserRole;
  onDone: () => void;
}

const ResolveTab: React.FC<IResolveTabProps> = ({ service, ticket, role, onDone }) => {
  const [rootCause, setRootCause] = React.useState<string>(ticket.RootCause || '');
  const [resolution, setResolution] = React.useState<string>(ticket.Resolution || '');
  const [reusableKnowledge, setReusableKnowledge] = React.useState<string>(ticket.ReusableKnowledge || 'No');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string | undefined>(undefined);

  const awaitingConfirmation = ticket.Status === TICKET_STATUS.PENDING_EMPLOYEE_CONFIRMATION;
  const canSubmit = rootCause.trim().length > 0 && resolution.trim().length > 0 && !submitting;

  const submit = (): void => {
    setSubmitting(true);
    setMessage(undefined);
    // Per the reference workflow, resolving doesn't close the ticket outright -
    // it hands off to the requester for confirmation (a separate step, not yet
    // built - see build_plan.md Phase 6). This still fires the knowledge-draft
    // pipeline immediately when reusableKnowledge is 'Yes', independent of
    // whatever the requester later decides.
    service
      .updateTicketStatus(
        ticket.TicketNumber,
        TICKET_STATUS.PENDING_EMPLOYEE_CONFIRMATION,
        role.email,
        rootCause.trim(),
        resolution.trim(),
        reusableKnowledge
      )
      .then((result) => {
        if (result.success) {
          setMessage('Sent to the employee for confirmation.');
          onDone();
        } else {
          setMessage(result.message || 'Could not resolve ticket.');
        }
      })
      .catch((err: Error) => setMessage(err.message))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className={styles.tab}>
      {awaitingConfirmation && <p className={styles.message}>Already awaiting employee confirmation. Submitting will resend it.</p>}

      <label>
        Root cause (required)
        <textarea value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={2} />
      </label>
      <label>
        Resolution (required)
        <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2} />
      </label>
      <label>
        Reusable as knowledge article?
        <select value={reusableKnowledge} onChange={(e) => setReusableKnowledge(e.target.value)}>
          <option value="No">No</option>
          <option value="Yes">Yes</option>
        </select>
      </label>

      <button disabled={!canSubmit} onClick={submit}>
        Resolve &amp; send for confirmation
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default ResolveTab;
