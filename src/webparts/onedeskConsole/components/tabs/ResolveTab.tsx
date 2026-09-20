import * as React from 'react';
import styles from './Tab.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import type { IUserRole } from '../../models/IUserRole';
import { TICKET_STATUS } from '../../services/config';
import { TextArea, Checkbox, Button, StatusBanner } from '../ui';

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
      <StatusBanner tone="info">
        This does not close the ticket. It goes to {ticket.RequesterName} in Teams to confirm the fix — only their &quot;yes&quot;
        closes it.
      </StatusBanner>

      {awaitingConfirmation && (
        <StatusBanner tone="warn">Already awaiting employee confirmation. Submitting will resend it.</StatusBanner>
      )}

      <TextArea label="Root cause" required value={rootCause} onChange={(e) => setRootCause(e.target.value)} rows={3} />
      <TextArea label="What you did" required value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4} />
      <Checkbox
        label="Would this help someone else?"
        hint="A draft article is written for review. Nothing is published until a reviewer approves it."
        checked={reusableKnowledge === 'Yes'}
        onChange={(checked) => setReusableKnowledge(checked ? 'Yes' : 'No')}
      />

      <div className={styles.actions}>
        <Button variant="primary" size="lg" fullWidth disabled={!canSubmit} busy={submitting} onClick={submit}>
          Send to the employee to confirm
        </Button>
      </div>

      {message && <StatusBanner tone="info">{message}</StatusBanner>}
    </div>
  );
};

export default ResolveTab;
