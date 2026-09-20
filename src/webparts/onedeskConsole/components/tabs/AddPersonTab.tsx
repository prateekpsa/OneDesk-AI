import * as React from 'react';
import styles from './Tab.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import type { IUserRole } from '../../models/IUserRole';
import { TextInput, TextArea, Button, StatusBanner } from '../ui';

export interface IAddPersonTabProps {
  service: IOneDeskDataService;
  ticket: ITicket;
  role: IUserRole;
  onDone: () => void;
}

const AddPersonTab: React.FC<IAddPersonTabProps> = ({ service, ticket, role, onDone }) => {
  const [personName, setPersonName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [reason, setReason] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string | undefined>(undefined);

  const canSubmit = personName.trim().length > 0 && email.trim().length > 0 && !submitting;

  const submit = (): void => {
    setSubmitting(true);
    setMessage(undefined);
    service
      .addConcernedPerson(ticket.TicketNumber, personName.trim(), email.trim(), reason.trim(), role.email)
      .then((result) => {
        if (result.success) {
          setMessage(`Added ${personName}.`);
          setPersonName('');
          setEmail('');
          setReason('');
          onDone();
        } else {
          setMessage(result.message || 'Could not add person.');
        }
      })
      .catch((err: Error) => setMessage(err.message))
      .finally(() => setSubmitting(false));
  };

  return (
    <div className={styles.tab}>
      <p className={styles.description}>
        They get one email, worded for awareness rather than action. Ownership does not change, and they can find the ticket
        later under Shared with me.
      </p>

      <TextInput label="Name" required placeholder="Riya Mehta" value={personName} onChange={(e) => setPersonName(e.target.value)} />
      <TextInput
        label="Work email"
        type="email"
        required
        placeholder="name@preferredsquare.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextArea
        label="Why they need to know"
        hint="Optional."
        placeholder="Same symptom on the same floor."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
      />

      <div className={styles.actions}>
        <Button variant="primary" fullWidth disabled={!canSubmit} busy={submitting} onClick={submit}>
          Add and notify
        </Button>
      </div>

      {message && <StatusBanner tone="info">{message}</StatusBanner>}
    </div>
  );
};

export default AddPersonTab;
