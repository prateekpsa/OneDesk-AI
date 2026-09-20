import * as React from 'react';
import styles from './KnowledgeReview.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { IKnowledgeArticle } from '../models/IKnowledgeArticle';
import { ARTICLE_STATUS, TICKET_STATUS } from '../services/config';
import { PageHeader, TextInput, TextArea, Field, Button, Pill, StatusBanner, EmptyState, SearchInput, Icon } from './ui';
import { cx } from '../utils/cx';

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

interface IDraftRow {
  article: IKnowledgeArticle;
  /** No source ticket at all means there is nothing to gate on - always eligible. */
  eligible: boolean;
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

function keywordList(keywords: string): string[] {
  return keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

const KnowledgeReview: React.FC<IKnowledgeReviewProps> = ({ service, actorEmail, department }) => {
  const [rows, setRows] = React.useState<IDraftRow[]>([]);
  const [search, setSearch] = React.useState<string>('');
  const [selected, setSelected] = React.useState<IKnowledgeArticle | undefined>(undefined);
  const [form, setForm] = React.useState<IDraftForm>(EMPTY_FORM);
  const [newKeyword, setNewKeyword] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string | undefined>(undefined);

  const reload = React.useCallback((): void => {
    setError(undefined);
    service
      .getKnowledgeArticles({ articleStatus: ARTICLE_STATUS.DRAFT, department })
      .then(async (drafts) => {
        const withEligibility = await Promise.all(
          drafts.map(async (article) => {
            const ticket = article.SourceTicket ? await service.getTicketByNumber(article.SourceTicket) : undefined;
            return { article, eligible: !article.SourceTicket || ticket?.Status === TICKET_STATUS.CLOSED };
          })
        );
        setRows(withEligibility);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load drafts.'))
      .finally(() => setLoading(false));
  }, [service, department]);

  React.useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const selectedRow = rows.find((r) => r.article.Id === selected?.Id);
  const selectedEligible = selectedRow ? selectedRow.eligible : false;

  const selectDraft = (row: IDraftRow): void => {
    setSelected(row.article);
    setForm(toForm(row.article));
    setNewKeyword('');
    setMessage(undefined);
  };

  const canPublish = selected && selectedEligible && form.title.trim().length > 0 && form.resolution.trim().length > 0 && !submitting;

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

  const addKeyword = (): void => {
    const value = newKeyword.trim();
    if (!value) return;
    const current = keywordList(form.keywords);
    if (current.indexOf(value) === -1) {
      setForm({ ...form, keywords: [...current, value].join(', ') });
    }
    setNewKeyword('');
  };

  const removeKeyword = (keyword: string): void => {
    setForm({ ...form, keywords: keywordList(form.keywords).filter((k) => k !== keyword).join(', ') });
  };

  const onKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const filteredRows = search.trim()
    ? rows.filter((r) => r.article.Title.toLowerCase().indexOf(search.trim().toLowerCase()) !== -1)
    : rows;

  const waitingCount = rows.length;
  const lockedCount = rows.filter((r) => !r.eligible).length;

  return (
    <section className={styles.review}>
      <PageHeader
        title="Knowledge review"
        subtitle={department ? `Scoped to ${department}` : 'All departments'}
        actions={
          !loading && !error && waitingCount > 0 ? (
            <Pill tone="neutral" size="md">
              {waitingCount} waiting{lockedCount > 0 ? ` · ${lockedCount} locked` : ''}
            </Pill>
          ) : undefined
        }
      />

      {error && <StatusBanner tone="danger">{error}</StatusBanner>}
      {!error && loading && <p className={styles.loading}>Loading…</p>}

      {!error && !loading && (
        <div className={styles.body}>
          <section className={styles.listPanel}>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>Drafts waiting</h2>
              <SearchInput label="Search drafts" placeholder="Search drafts" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className={styles.draftScroll}>
              {rows.length === 0 && (
                <EmptyState title="No drafts waiting" description="Drafts appear once a resolved ticket is marked reusable." />
              )}
              {rows.length > 0 && filteredRows.length === 0 && (
                <EmptyState title="No matches" description={`No drafts match "${search.trim()}".`} />
              )}
              {filteredRows.map((row) => (
                <button
                  key={row.article.Id}
                  type="button"
                  className={cx(
                    styles.draftCard,
                    selected?.Id === row.article.Id && styles.draftCardActive,
                    !row.eligible && styles.draftCardLocked
                  )}
                  onClick={() => selectDraft(row)}
                >
                  <span className={styles.draftTitle}>{row.article.Title}</span>
                  {row.article.SourceTicket && <span className={styles.draftMeta}>From {row.article.SourceTicket}</span>}
                  <Pill tone={row.eligible ? 'success' : 'warn'} size="sm" dot={!row.eligible}>
                    {row.eligible ? 'Source ticket closed' : 'Locked · ticket still open'}
                  </Pill>
                </button>
              ))}
            </div>
          </section>

          <section className={styles.formPanel}>
            {!selected && (
              <div className={styles.formEmpty}>
                <EmptyState variant="panel" title="Select a draft" description="Choose a draft on the left to review it." />
              </div>
            )}

            {selected && (
              <>
                <div className={styles.formHeader}>
                  <div className={styles.formHeaderText}>
                    <h2 className={styles.formTitle}>Review this draft</h2>
                    <span className={styles.formMeta}>
                      Written by the agent
                      {selected.SourceTicket && (
                        <>
                          {' '}
                          from <span className={styles.ticketRef}>{selected.SourceTicket}</span>
                        </>
                      )}
                      {selected.ArticleOwner && <> · owner {selected.ArticleOwner}</>}
                    </span>
                  </div>
                  <div className={styles.formHeaderPills}>
                    <Pill tone="neutral">Draft</Pill>
                    <Pill tone="neutral">{selected.Department}</Pill>
                  </div>
                </div>

                <div className={styles.formBody}>
                  <TextInput label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

                  <div className={styles.formRow2}>
                    <TextArea
                      label="Problem"
                      value={form.problemDescription}
                      onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
                      rows={3}
                    />
                    <TextArea label="Symptoms" value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} rows={3} />
                  </div>

                  <TextArea label="Root cause" value={form.rootCause} onChange={(e) => setForm({ ...form, rootCause: e.target.value })} rows={2} />
                  <TextArea
                    label="Resolution — the steps an employee can follow"
                    required
                    value={form.resolution}
                    onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                    rows={5}
                  />

                  <Field id="kr-keywords" label="Keywords the agent searches on" hint="Press Enter to add a keyword.">
                    <div className={styles.keywordRow}>
                      {keywordList(form.keywords).map((k) => (
                        <span key={k} className={styles.keywordChip}>
                          {k}
                          <button
                            type="button"
                            aria-label={`Remove keyword ${k}`}
                            className={styles.keywordRemove}
                            onClick={() => removeKeyword(k)}
                          >
                            <Icon name="close" size={10} strokeWidth={2.8} />
                          </button>
                        </span>
                      ))}
                      <input
                        id="kr-keywords"
                        type="text"
                        className={styles.keywordInput}
                        placeholder="Add a keyword and press Enter"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={onKeywordKeyDown}
                      />
                    </div>
                  </Field>
                </div>

                <div className={styles.formFooter}>
                  {selected.SourceTicket && (
                    <span className={styles.footerNote}>
                      <Icon name={selectedEligible ? 'check' : 'lock'} size={14} strokeWidth={2.2} />
                      {selectedEligible
                        ? 'The source ticket is closed, so this draft can be published.'
                        : `Locked — publishing is disabled until ${selected.SourceTicket} is closed.`}
                    </span>
                  )}
                  <div className={styles.footerSpacer} />
                  <Button variant="primary" disabled={!canPublish} busy={submitting} onClick={publish}>
                    Publish to the agent
                  </Button>
                </div>
              </>
            )}

            {message && (
              <div className={styles.formMessage}>
                <StatusBanner tone="info">{message}</StatusBanner>
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
};

export default KnowledgeReview;
