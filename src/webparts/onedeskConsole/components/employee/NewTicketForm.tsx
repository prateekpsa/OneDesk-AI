import * as React from 'react';
import styles from './NewTicketForm.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ICategory } from '../../models/ICategory';
import type { IKnowledgeArticle } from '../../models/IKnowledgeArticle';
import type { IUserRole } from '../../models/IUserRole';
import { PRIORITY, ARTICLE_STATUS } from '../../services/config';
import { PageHeader, Select, TextArea, Button, StatusBanner, EmptyState, SectionHeading, Icon, SLA_HOURS_BY_PRIORITY } from '../ui';
import { cx } from '../../utils/cx';

const PRIORITIES = [PRIORITY.LOW, PRIORITY.MEDIUM, PRIORITY.HIGH, PRIORITY.CRITICAL];

const PRIORITY_HINT: Record<string, string> = {
  [PRIORITY.LOW]: 'A request',
  [PRIORITY.MEDIUM]: 'Annoying, workable',
  [PRIORITY.HIGH]: 'You are blocked',
  [PRIORITY.CRITICAL]: 'The team is stopped',
};

export interface INewTicketFormProps {
  service: IOneDeskDataService;
  requesterEmail: string;
  requesterName: string;
  role: IUserRole;
}

function keywordList(keywords: string): string[] {
  return keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
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
  const [publishedArticles, setPublishedArticles] = React.useState<IKnowledgeArticle[]>([]);

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

  React.useEffect(() => {
    if (!department) {
      setPublishedArticles([]);
      return;
    }
    service
      .getKnowledgeArticles({ articleStatus: ARTICLE_STATUS.PUBLISHED, department })
      .then(setPublishedArticles)
      .catch(() => setPublishedArticles([]));
  }, [service, department]);

  const categoriesForDepartment = React.useMemo(
    () => categories.filter((c) => c.Department === department),
    [categories, department]
  );

  const suggestions = React.useMemo(() => {
    const text = description.trim().toLowerCase();
    if (!text) return [];
    return publishedArticles.filter((a) => keywordList(a.Keywords || '').some((k) => text.indexOf(k.toLowerCase()) !== -1)).slice(0, 3);
  }, [publishedArticles, description]);

  const changeDepartment = (dept: string): void => {
    setDepartment(dept);
    const first = categories.find((c) => c.Department === dept);
    setCategory(first ? first.CategoryName : '');
  };

  const clearForm = (): void => {
    setDescription('');
    setPriority(PRIORITY.MEDIUM);
    setMessage(undefined);
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
        <PageHeader title="Raise a ticket" />
        <EmptyState title="No other departments to raise a ticket with" />
      </section>
    );
  }

  return (
    <section className={styles.form}>
      <PageHeader title="Raise a ticket" subtitle="Four fields. The desk that can help gets it straight away." />

      <div className={styles.body}>
        <div className={styles.formCard}>
          <div className={styles.row2}>
            <Select
              label="Which desk?"
              value={department}
              onChange={(e) => changeDepartment(e.target.value)}
              options={departments.map((d) => ({ value: d, label: d }))}
            />

            <Select
              label="What kind of problem?"
              hint="The list changes with the desk you pick."
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={categoriesForDepartment.map((c) => ({ value: c.CategoryName, label: c.CategoryName }))}
            />
          </div>

          <fieldset className={styles.priorityFieldset}>
            <legend className={styles.priorityLegend}>How much is it blocking you?</legend>
            <div className={styles.priorityGrid}>
              {PRIORITIES.map((p) => (
                <label key={p} className={cx(styles.priorityCard, priority === p && styles.priorityCardActive)}>
                  <span className={styles.priorityTop}>
                    <input
                      type="radio"
                      name="rt-priority"
                      value={p}
                      checked={priority === p}
                      onChange={() => setPriority(p)}
                      className={styles.priorityRadio}
                    />
                    <span className={styles.priorityLabel}>{p}</span>
                  </span>
                  <span className={styles.priorityHint}>
                    {PRIORITY_HINT[p]} · {SLA_HOURS_BY_PRIORITY[p]}h
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <TextArea
            label="What is happening?"
            required
            placeholder="What you were doing, what happened instead, and anything you already tried."
            hint="The first line becomes the subject staff see."
            counter={`${description.length} characters`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
          />

          <div className={styles.divider} />

          <div className={styles.footer}>
            <span className={styles.footerNote}>
              Raised as {requesterName} · you will be asked to confirm before it is closed.
            </span>
            <div className={styles.footerSpacer} />
            <Button variant="secondary" size="lg" onClick={clearForm}>
              Clear
            </Button>
            <Button variant="primary" size="lg" disabled={!canSubmit} busy={submitting} onClick={submit}>
              Raise ticket
            </Button>
          </div>

          {message && <StatusBanner tone="info">{message}</StatusBanner>}
        </div>

        <div className={styles.sidebar}>
          {suggestions.length > 0 && (
            <section className={styles.panel}>
              <SectionHeading>
                <span className={styles.panelTitleWithIcon}>
                  <Icon name="search" size={16} strokeWidth={1.9} />
                  This might already be answered
                </span>
              </SectionHeading>
              <p className={styles.panelNote}>
                {suggestions.length} published article{suggestions.length === 1 ? '' : 's'} match what you have written so far.
              </p>
              {suggestions.map((a) => (
                <div key={a.Id} className={styles.suggestionCard}>
                  <span className={styles.suggestionTitle}>{a.Title}</span>
                  {a.ProblemDescription && <span className={styles.suggestionDesc}>{a.ProblemDescription}</span>}
                </div>
              ))}
              <span className={styles.panelFootnote}>If one of these solves it, you do not need a ticket at all.</span>
            </section>
          )}

          <section className={styles.panel}>
            <SectionHeading>What happens next</SectionHeading>
            <ol className={styles.steps}>
              <li className={styles.step}>
                <span className={styles.stepNum}>1</span>
                <span className={styles.stepText}>You get a ticket number straight away, in the PSDESK-{'{desk}'}-000000 format.</span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNum}>2</span>
                <span className={styles.stepText}>
                  {department || 'The'} desk picks it up. {priority} priority means they aim to respond within{' '}
                  {SLA_HOURS_BY_PRIORITY[priority]} hours.
                </span>
              </li>
              <li className={styles.step}>
                <span className={styles.stepNum}>3</span>
                <span className={styles.stepText}>
                  When they think it is fixed, you get a message in Teams. It only closes when you say it is sorted.
                </span>
              </li>
            </ol>
          </section>
        </div>
      </div>
    </section>
  );
};

export default NewTicketForm;
