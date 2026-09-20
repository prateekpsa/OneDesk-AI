import * as React from 'react';
import styles from './Tab.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import type { IUserRole } from '../../models/IUserRole';

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
      <label>
        Name (required)
        <input value={personName} onChange={(e) => setPersonName(e.target.value)} />
      </label>
      <label>
        Email (required)
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Reason
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
      </label>

      <button disabled={!canSubmit} onClick={submit}>
        Add concerned person
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};

export default AddPersonTab;
