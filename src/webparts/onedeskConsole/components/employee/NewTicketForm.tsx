import * as React from 'react';
import styles from './NewTicketForm.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ICategory } from '../../models/ICategory';
import type { IUserRole } from '../../models/IUserRole';
import { PRIORITY } from '../../services/config';

const PRIORITIES = [PRIORITY.LOW, PRIORITY.MEDIUM, PRIORITY.HIGH, PRIORITY.CRITICAL];

export interface INewTicketFormProps {
  service: IOneDeskDataService;
  requesterEmail: string;
  requesterName: string;
  role: IUserRole;
}

/** Phase 6 (build_plan.md) - employee self-service ticket raising, mirrors the Copilot agent's CreateTicket flow. */
const NewTicketForm: React.FC<INewTicketFormProps> = ({ service, requesterEmail, requesterName, role }) => {
  const [categories, setCategories] = React.useState<ICategory[]>([]);
  const [department, setDepartment] = React.useState<string>('');
  const [category, setCategory] = React.useState<string>('');
  const [priority, setPriority] = React.useState<string>(PRIORITY.MEDIUM);
  const [description, setDescription] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    service.getCategories().then(setCategories).catch((err: Error) => setMessage(err.message || 'Failed to load categories.'));
  }, [service]);

  // A staff member's own department never appears here - they'd act on
  // those tickets directly, not raise one to themselves.
  const departments = React.useMemo(() => {
    const seen: string[] = [];
    categories.forEach((c) => {
      if (seen.indexOf(c.Department) === -1 && c.Department !== role.team) seen.push(c.Department);
    });
    return seen;
  }, [categories, role.team]);

  // Picks the first *allowed* department, once the list is known - not
  // just categories[0], which might be the department that's excluded.
  React.useEffect(() => {
    if (departments.length === 0) {
      setDepartment('');
      setCategory('');
      return;
    }
    if (departments.indexOf(department) === -1) {
      const first = departments[0];
      setDepartment(first);
      const firstCategory = categories.find((c) => c.Department === first);
      setCategory(firstCategory ? firstCategory.CategoryName : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments]);

  const categoriesForDepartment = React.useMemo(
    () => categories.filter((c) => c.Department === department),
    [categories, department]
  );

  const changeDepartment = (dept: string): void => {
    setDepartment(dept);
    const first = categories.find((c) => c.Department === dept);
    setCategory(first ? first.CategoryName : '');
  };

  const canSubmit = department.length > 0 && category.length > 0 && description.trim().length > 0 && !submitting;

  const submit = (): void => {
    setSubmitting(true);
    setMessage(undefined);
    service
      .createTicket({ department, category, priority, description: description.trim(), requesterEmail, requesterName })
      .then((result) => {
        if (result.success) {
          setMessage(`Raised ${result.ticketNumber} with the ${department} team.`);
          setDescription('');
        } else {
          setMessage(result.message || 'Could not raise the ticket.');
        }
      })
      .catch((err: Error) => setMessage(err.message))
      .finally(() => setSubmitting(false));
  };

  if (categories.length > 0 && departments.length === 0) {
    return (
      <section className={styles.form}>
        <h3 className={styles.heading}>Raise a ticket</h3>
        <p className={styles.message}>There are no other departments to raise a ticket with.</p>
      </section>
    );
  }

  return (
    <section className={styles.form}>
      <h3 className={styles.heading}>Raise a ticket</h3>

      <label>
        Department
        <select value={department} onChange={(e) => changeDepartment(e.target.value)}>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label>
        Category
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categoriesForDepartment.map((c) => (
            <option key={c.Id} value={c.CategoryName}>
              {c.CategoryName}
            </option>
          ))}
        </select>
      </label>

      <label>
        Priority
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label>
        Describe the problem (required)
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
      </label>

      <button disabled={!canSubmit} onClick={submit}>
        Raise ticket
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </section>
  );
};

export default NewTicketForm;
