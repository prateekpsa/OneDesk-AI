import * as React from 'react';
import styles from './KnowledgeReview.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { IKnowledgeArticle } from '../models/IKnowledgeArticle';
import { ARTICLE_STATUS, TICKET_STATUS } from '../services/config';

export interface IKnowledgeReviewProps {
  service: IOneDeskDataService;
  actorEmail: string;
  /** undefined means all departments (admin view). */
  department?: string;
}

interface IDraftForm {
  title: string;
  problemDescription: string;
  symptoms: string;
  rootCause: string;
  resolution: string;
  keywords: string;
}

const EMPTY_FORM: IDraftForm = { title: '', problemDescription: '', symptoms: '', rootCause: '', resolution: '', keywords: '' };

function toForm(a: IKnowledgeArticle): IDraftForm {
  return {
    title: a.Title || '',
    problemDescription: a.ProblemDescription || '',
    symptoms: a.Symptoms || '',
    rootCause: a.RootCause || '',
    resolution: a.Resolution || '',
    keywords: a.Keywords || '',
  };
}

/** Phase 4 screen 4 (build_plan.md) - draft queue, editable fields, Publish. */
const KnowledgeReview: React.FC<IKnowledgeReviewProps> = ({ service, actorEmail, department }) => {
  const [drafts, setDrafts] = React.useState<IKnowledgeArticle[]>([]);
  const [selected, setSelected] = React.useState<IKnowledgeArticle | undefined>(undefined);
  const [form, setForm] = React.useState<IDraftForm>(EMPTY_FORM);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string | undefined>(undefined);

  const reload = React.useCallback((): void => {
    setError(undefined);
    service
      .getKnowledgeArticles({ articleStatus: ARTICLE_STATUS.DRAFT, department })
      .then(async (rows) => {
        // Only drafts whose source ticket is Closed are eligible to publish -
        // publishing before the requester confirms the fix risks publishing a
        // "solution" that turns out to be wrong. A draft with no source
        // ticket at all has nothing to gate on, so it's always eligible.
        const withTicket = await Promise.all(
          rows.map(async (article) => ({
            article,
            ticket: article.SourceTicket ? await service.getTicketByNumber(article.SourceTicket) : undefined,
          }))
        );
        const eligible = withTicket
          .filter(({ article, ticket }) => !article.SourceTicket || ticket?.Status === TICKET_STATUS.CLOSED)
          .map(({ article }) => article);
        setDrafts(eligible);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load drafts.'))
      .finally(() => setLoading(false));
  }, [service, department]);

  React.useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const selectDraft = (a: IKnowledgeArticle): void => {
    setSelected(a);
    setForm(toForm(a));
    setMessage(undefined);
  };

  const canPublish = selected && form.title.trim().length > 0 && form.resolution.trim().length > 0 && !submitting;

  const publish = (): void => {
    if (!selected) return;
    setSubmitting(true);
    setMessage(undefined);
    service
      .publishKnowledgeArticle(
        {
          articleId: selected.Id,
          title: form.title.trim(),
          problemDescription: form.problemDescription.trim(),
          symptoms: form.symptoms.trim(),
          rootCause: form.rootCause.trim(),
          resolution: form.resolution.trim(),
          keywords: form.keywords.trim(),
          sourceTicket: selected.SourceTicket,
        },
        actorEmail
      )
      .then((result) => {
        if (result.success) {
          setMessage(`Published "${form.title.trim()}".`);
          setSelected(undefined);
          setForm(EMPTY_FORM);
          reload();
        } else {
          setMessage(result.message || 'Could not publish.');
        }
      })
      .catch((err: Error) => setMessage(err.message))
      .finally(() => setSubmitting(false));
  };

  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <section className={styles.review}>
      <div className={styles.list}>
        <h3 className={styles.sectionHeading}>Drafts waiting</h3>
        <ul>
          {drafts.map((a) => (
            <li
              key={a.Id}
              className={selected?.Id === a.Id ? styles.itemActive : styles.item}
              onClick={() => selectDraft(a)}
            >
              {a.Title}
            </li>
          ))}
          {drafts.length === 0 && <li>None.</li>}
        </ul>
      </div>

      <div className={styles.form}>
        {!selected && <p>Select a draft to review.</p>}
        {selected && (
          <>
            <label>
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </label>
            <label>
              Problem description
              <textarea
                value={form.problemDescription}
                onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
                rows={2}
              />
            </label>
            <label>
              Symptoms
              <textarea value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} rows={2} />
            </label>
            <label>
              Root cause
              <textarea value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} rows={2} />
            </label>
            <label>
              Resolution (required)
              <textarea value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} rows={2} />
            </label>
            <label>
              Keywords
              <input value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
            </label>

            <button disabled={!canPublish} onClick={publish}>
              Publish
            </button>
          </>
        )}

        {message && <p className={styles.message}>{message}</p>}
      </div>
    </section>
  );
};

export default KnowledgeReview;
