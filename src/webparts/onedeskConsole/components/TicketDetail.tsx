import * as React from 'react';
import styles from './TicketDetail.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { ITicket } from '../models/ITicket';
import type { IParticipant } from '../models/IParticipant';
import type { IAuditLogEntry } from '../models/IAuditLogEntry';
import type { IUserRole } from '../models/IUserRole';
import { normalizeEmail, TICKET_STATUS, SLA_HOURS_BY_PRIORITY, ACTION_TYPE } from '../services/config';
import { getSlaState } from '../utils/slaHelpers';
import { Button, StatusPill, PriorityPill, SlaPill, Pill, StatusBanner, SectionHeading, EmptyState, TicketStatus, TicketPriority } from './ui';
import { cx } from '../utils/cx';
import ReassignTab from './tabs/ReassignTab';
import AddPersonTab from './tabs/AddPersonTab';
import ResolveTab from './tabs/ResolveTab';

type TabKey = 'reassign' | 'addPerson' | 'resolve';

export interface ITicketDetailProps {
  service: IOneDeskDataService;
  ticketNumber: string;
  role: IUserRole;
  onBack: () => void;
  /** e.g. "Back to My Tickets" - defaults to "Back to Queue". */
  backLabel?: string;
}

const ACTION_LABEL: Record<string, string> = {
  [ACTION_TYPE.TICKET_CREATED]: 'Ticket created',
  [ACTION_TYPE.STATUS_CHANGED]: 'Status changed',
  [ACTION_TYPE.REASSIGNED]: 'Reassigned',
  [ACTION_TYPE.CONCERNED_PERSON_ADDED]: 'Concerned person added',
  [ACTION_TYPE.CLOSURE_CONFIRMED]: 'Closure confirmed',
  [ACTION_TYPE.REOPENED]: 'Reopened',
  [ACTION_TYPE.KNOWLEDGE_DRAFTED]: 'Knowledge drafted',
  [ACTION_TYPE.KNOWLEDGE_PUBLISHED]: 'Knowledge published',
  [ACTION_TYPE.DUPLICATE_REPORTED]: 'Duplicate reported',
};

function actionHeadline(entry: IAuditLogEntry): string {
  const label = ACTION_LABEL[entry.ActionType] || entry.ActionType;
  return entry.Details ? `${label} — ${entry.Details}` : label;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return date.toDateString() === new Date().toDateString() ? `Today, ${time}` : `${date.toLocaleDateString()}, ${time}`;
}

/** The exact-hours phrasing for the prominent header badge - the compact SlaPill label elsewhere stays generic. */
function headerSlaLabel(ticket: ITicket): string {
  const state = getSlaState(ticket);
  if (state === 'closed') return 'Closed';
  if (state === 'unknown' || !ticket.SLADueDateTime) return 'No SLA target';
  const diffHours = Math.round(Math.abs(Date.now() - new Date(ticket.SLADueDateTime).getTime()) / 3600000);
  return state === 'breached' ? `SLA breached ${diffHours}h ago` : `Due in ${diffHours}h`;
}

function slaTargetNote(ticket: ITicket): { text: string; danger?: boolean } {
  const state = getSlaState(ticket);
  if (state === 'unknown' || !ticket.SLADueDateTime) return { text: 'No target set' };
  if (state === 'closed') return { text: 'Ticket closed' };
  const time = new Date(ticket.SLADueDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return state === 'breached' ? { text: `Was due ${time}`, danger: true } : { text: `Due ${time}` };
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'reassign', label: 'Reassign' },
  { key: 'addPerson', label: 'Add a person' },
  { key: 'resolve', label: 'Resolve' },
];

/**
 * Phase 4 screen 3 (build_plan.md), scoped by role in Phase 5: full access
 * (the three action tabs) if the caller's department owns the ticket (or
 * they're an admin); read-only if they raised it or were added to it as a
 * participant; otherwise nothing but the fact that it exists is shown.
 */
const TicketDetail: React.FC<ITicketDetailProps> = ({ service, ticketNumber, role, onBack, backLabel }) => {
  const [ticket, setTicket] = React.useState<ITicket | undefined>(undefined);
  const [participants, setParticipants] = React.useState<IParticipant[]>([]);
  const [auditLog, setAuditLog] = React.useState<IAuditLogEntry[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [tab, setTab] = React.useState<TabKey>('reassign');

  const reload = React.useCallback((): void => {
    setError(undefined);
    Promise.all([
      service.getTicketByNumber(ticketNumber),
      service.getParticipants(ticketNumber),
      service.getAuditLog(ticketNumber),
    ])
      .then(([t, p, a]) => {
        setTicket(t);
        setParticipants(p);
        setAuditLog([...a].sort((x, y) => new Date(y.EventTimestamp).getTime() - new Date(x.EventTimestamp).getTime()));
      })
      .catch((err: Error) => setError(err.message || 'Failed to load ticket.'))
      .finally(() => setLoading(false));
  }, [service, ticketNumber]);

  React.useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const ownsTicket = !!ticket && (role.kind === 'admin' || (role.kind === 'staff' && role.team === ticket.CurrentOwnerTeam));
  const isClosed = ticket?.Status === TICKET_STATUS.CLOSED;
  // A department owner/admin can still see a Closed ticket - they just
  // can't act on it (writes refuse it server-side too, see REFUSAL.TICKET_CLOSED).
  const canAct = ownsTicket && !isClosed;
  const isRequester = !!ticket && normalizeEmail(ticket.RequesterEmail) === normalizeEmail(role.email);
  const isParticipant = participants.some((p) => normalizeEmail(p.Email) === normalizeEmail(role.email));
  const canOpen = ownsTicket || isRequester || isParticipant;

  return (
    <section className={styles.detail}>
      <div className={styles.breadcrumb}>
        <Button variant="quiet" size="sm" iconBefore="chevronLeft" onClick={onBack}>
          {backLabel || 'Back to Queue'}
        </Button>
        {ticket && (
          <span className={styles.scopeText}>
            {ticket.CurrentOwnerTeam}
            {ticket.Category ? ` · ${ticket.Category}` : ''}
          </span>
        )}
      </div>

      {error && <StatusBanner tone="danger">{error}</StatusBanner>}
      {!error && loading && <p className={styles.loading}>Loading…</p>}
      {!error && !loading && !ticket && <EmptyState title={`Ticket ${ticketNumber} not found`} />}
      {!loading && !error && ticket && !canOpen && (
        <StatusBanner tone="danger">You don&apos;t have access to {ticketNumber}.</StatusBanner>
      )}

      {!loading && !error && ticket && canOpen && (
        <>
          <header className={styles.headerCard}>
            <div className={styles.headerTop}>
              <div className={styles.titleBlock}>
                <span className={styles.ticketNumber}>{ticket.TicketNumber}</span>
                <h1 className={styles.title}>{ticket.Title}</h1>
              </div>
              <div className={styles.badges}>
                <StatusPill status={ticket.Status as TicketStatus} size="md" />
                <PriorityPill priority={ticket.Priority as TicketPriority} size="md" />
                <SlaPill state={getSlaState(ticket)} label={headerSlaLabel(ticket)} size="md" />
              </div>
            </div>
            <div className={styles.divider} />
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Raised by</span>
                <span className={styles.metaPrimary}>{ticket.RequesterName}</span>
                <span className={styles.metaSecondary}>{ticket.RequesterEmail}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Owned by</span>
                <span className={styles.metaPrimary}>{ticket.CurrentOwnerTeam}</span>
                <span className={styles.metaSecondary}>{ticket.AssignedTo || 'Unassigned'}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Raised</span>
                <span className={styles.metaPrimary}>{formatDateTime(ticket.TicketCreatedDate)}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>SLA target</span>
                <span className={styles.metaPrimary}>
                  {SLA_HOURS_BY_PRIORITY[ticket.Priority] || 24} hours ({ticket.Priority})
                </span>
                <span className={cx(styles.metaSecondary, slaTargetNote(ticket).danger && styles.metaDanger)}>
                  {slaTargetNote(ticket).text}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Knowledge</span>
                <span className={styles.metaPrimary}>{ticket.KnowledgeArticleId ? 'Knowledge article linked' : 'No article yet'}</span>
                {!ticket.KnowledgeArticleId && <span className={styles.metaSecondary}>Set on resolution</span>}
              </div>
            </div>
          </header>

          <div className={cx(styles.body, !canAct && styles.bodyNoAside)}>
            <div className={styles.main}>
              <section className={styles.panel}>
                <SectionHeading>What the employee reported</SectionHeading>
                {ticket.Description ? (
                  <p className={styles.description}>{ticket.Description}</p>
                ) : (
                  <EmptyState variant="inline" title="No description provided" />
                )}
              </section>

              {!canAct && (
                <StatusBanner tone="muted">
                  Read-only —{' '}
                  {isClosed ? 'this ticket is closed.' : isRequester ? 'you raised this ticket.' : 'you were added to this ticket.'}
                </StatusBanner>
              )}

              <section className={styles.panel}>
                <SectionHeading aside={<span className={styles.panelNote}>Visibility only — they do not own the ticket</span>}>
                  Concerned people
                </SectionHeading>
                {participants.length === 0 ? (
                  <EmptyState variant="inline" title="No participants" />
                ) : (
                  <div className={styles.participantList}>
                    {participants.map((p) => (
                      <div key={p.Id} className={styles.participantRow}>
                        <span className={styles.avatar} aria-hidden="true">
                          {initials(p.PersonName)}
                        </span>
                        <div className={styles.participantInfo}>
                          <span className={styles.participantName}>{p.PersonName}</span>
                          <span className={styles.participantMeta}>
                            {[p.Reason, `added by ${p.AddedBy}, ${formatDateTime(p.AddedDate)}`].filter(Boolean).join(' · ')}
                          </span>
                        </div>
                        <Pill size="sm">{p.Role}</Pill>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.panel}>
                <SectionHeading aside={<span className={styles.panelNote}>Newest first · written by the flows, never edited here</span>}>
                  History
                </SectionHeading>
                {auditLog.length === 0 ? (
                  <EmptyState variant="inline" title="No activity yet" />
                ) : (
                  <div className={styles.timeline}>
                    {auditLog.map((a, index) => (
                      <div key={a.Id} className={styles.timelineRow}>
                        <div className={styles.timelineRail}>
                          <span className={styles.timelineDot} />
                          {index < auditLog.length - 1 && <span className={styles.timelineLine} />}
                        </div>
                        <div className={styles.timelineContent}>
                          <span className={styles.timelineHeadline}>{actionHeadline(a)}</span>
                          <span className={styles.timelineMeta}>
                            {a.PerformedBy} · {formatDateTime(a.EventTimestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {canAct && (
              <aside className={styles.actionPanel}>
                <div className={styles.actionHeader}>
                  <h2 className={styles.actionTitle}>Take action</h2>
                  <Pill tone="success" dot outlined={false}>
                    You can act
                  </Pill>
                </div>
                <div className={styles.tabs} role="tablist">
                  {TABS.map((t) => (
                    <Button
                      key={t.key}
                      variant="quiet"
                      size="sm"
                      role="tab"
                      aria-selected={tab === t.key}
                      className={cx(styles.tabButton, tab === t.key && styles.tabActive)}
                      onClick={() => setTab(t.key)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
                <div className={styles.tabPanel}>
                  {tab === 'reassign' && <ReassignTab service={service} ticket={ticket} role={role} onDone={reload} />}
                  {tab === 'addPerson' && <AddPersonTab service={service} ticket={ticket} role={role} onDone={reload} />}
                  {tab === 'resolve' && <ResolveTab service={service} ticket={ticket} role={role} onDone={reload} />}
                </div>
              </aside>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default TicketDetail;
