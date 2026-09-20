import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/items/get-all';
import { WebPartContext } from '@microsoft/sp-webpart-base';

import { IOneDeskDataService, ITicketFilter, IKnowledgeArticleFilter } from './IOneDeskDataService';
import { ITicket } from '../models/ITicket';
import { IParticipant } from '../models/IParticipant';
import { IKnowledgeArticle } from '../models/IKnowledgeArticle';
import { ICommittee } from '../models/ICommittee';
import { IAuditLogEntry } from '../models/IAuditLogEntry';
import { IDashboardCounts } from '../models/IDashboardCounts';
import { ICategory } from '../models/ICategory';
import { IWriteResult } from '../models/IWriteResult';
import { IPublishKnowledgeArticleInput } from '../models/IPublishKnowledgeArticleInput';
import { ICreateTicketInput } from '../models/ICreateTicketInput';
import { ICreateTicketResult } from '../models/ICreateTicketResult';
import {
  SITE_URL,
  LISTS,
  TICKET_STATUS,
  ARTICLE_STATUS,
  ACTION_TYPE,
  PARTICIPANT_ROLE,
  SLA_HOURS_BY_PRIORITY,
  REFUSAL,
  formatTicketNumber,
  normalizeEmail,
  deriveRole,
  USER_SCOPE_FIELD,
} from './config';

const TICKET_FIELDS = [
  'Id',
  'Title',
  'TicketNumber',
  'Description',
  'Department',
  'CurrentOwnerTeam',
  'Category',
  'Priority',
  'Status',
  'RequesterEmail',
  'RequesterName',
  'AssignedTo',
  'RootCause',
  'Resolution',
  'ReusableKnowledge',
  'KnowledgeArticleId',
  'SLADueDateTime',
  'TicketCreatedDate',
  'ClosedDate',
  'ClosureConfirmedBy',
  'ReassignReason',
  'Modified',
];

/** Escapes a single-quoted OData string literal ('O'Brien' -> 'O''Brien'). */
function odataLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export class SharePointDataService implements IOneDeskDataService {
  private sp: SPFI;

  /** Caches getCallerProfile's in-flight promise per email - Dashboard/Queue/shell mount together and would otherwise triple-query StaffDirectory for the same person. */
  private profileCache = new Map<string, Promise<{ userScope?: string }>>();

  constructor(context: WebPartContext) {
    this.sp = spfi(SITE_URL).using(SPFx(context));
  }

  public async getTickets(filter?: ITicketFilter): Promise<ITicket[]> {
    const clauses: string[] = [];
    if (filter?.status) clauses.push(`Status eq '${odataLiteral(filter.status)}'`);
    if (filter?.team) clauses.push(`CurrentOwnerTeam eq '${odataLiteral(filter.team)}'`);
    if (filter?.requesterEmail) clauses.push(`RequesterEmail eq '${odataLiteral(filter.requesterEmail)}'`);

    let query = this.sp.web.lists.getByTitle(LISTS.TICKETS).items.select(...TICKET_FIELDS).top(2000);
    if (clauses.length) query = query.filter(clauses.join(' and '));

    return query() as Promise<ITicket[]>;
  }

  public async getTicketByNumber(ticketNumber: string): Promise<ITicket | undefined> {
    const rows = (await this.sp.web.lists
      .getByTitle(LISTS.TICKETS)
      .items.select(...TICKET_FIELDS)
      .filter(`TicketNumber eq '${odataLiteral(ticketNumber)}'`)
      .top(1)()) as ITicket[];
    return rows[0];
  }

  public async getParticipants(ticketNumber: string): Promise<IParticipant[]> {
    return this.sp.web.lists
      .getByTitle(LISTS.TICKET_PARTICIPANTS)
      .items.filter(`TicketNumber eq '${odataLiteral(ticketNumber)}'`)
      .top(500)() as Promise<IParticipant[]>;
  }

  /** "Shared with me" (Phase 5) - the only way a concerned/watcher/approver reaches a ticket that's neither theirs nor their department's. */
  public async getTicketsForParticipant(email: string): Promise<ITicket[]> {
    const participantRows = (await this.sp.web.lists
      .getByTitle(LISTS.TICKET_PARTICIPANTS)
      .items.select('TicketNumber')
      .filter(`Email eq '${odataLiteral(email)}'`)
      .top(500)()) as { TicketNumber: string }[];

    const uniqueNumbers = Array.from(new Set(participantRows.map((r) => r.TicketNumber)));
    const tickets = await Promise.all(uniqueNumbers.map((n) => this.getTicketByNumber(n)));
    return tickets.filter((t): t is ITicket => !!t);
  }

  public async getAuditLog(ticketNumber: string): Promise<IAuditLogEntry[]> {
    return this.sp.web.lists
      .getByTitle(LISTS.AUDIT_LOGS)
      .items.filter(`TicketNumber eq '${odataLiteral(ticketNumber)}'`)
      .orderBy('EventTimestamp', false)
      .top(500)() as Promise<IAuditLogEntry[]>;
  }

  public async getKnowledgeArticles(filter?: IKnowledgeArticleFilter): Promise<IKnowledgeArticle[]> {
    const clauses: string[] = [];
    if (filter?.articleStatus) clauses.push(`ArticleStatus eq '${odataLiteral(filter.articleStatus)}'`);
    if (filter?.department) clauses.push(`Department eq '${odataLiteral(filter.department)}'`);

    let query = this.sp.web.lists.getByTitle(LISTS.KNOWLEDGE_ARTICLES).items.top(1000);
    if (clauses.length) query = query.filter(clauses.join(' and '));

    return query() as Promise<IKnowledgeArticle[]>;
  }

  public async getCommittees(): Promise<ICommittee[]> {
    return this.sp.web.lists.getByTitle(LISTS.COMMITTEES).items.top(100)() as Promise<ICommittee[]>;
  }

  /** `team` undefined means every department (the admin "All departments" view). */
  public async getDashboardCounts(team?: string): Promise<IDashboardCounts> {
    const teamClause = team ? `CurrentOwnerTeam eq '${odataLiteral(team)}' and ` : '';
    const nowIso = new Date().toISOString();
    // Breaching excludes every terminal status, not just Closed - a Resolved
    // or Cancelled ticket isn't "at risk" any more than a Closed one is.
    const notTerminal = `Status ne '${TICKET_STATUS.CLOSED}' and Status ne '${TICKET_STATUS.RESOLVED}' and Status ne '${TICKET_STATUS.CANCELLED}'`;

    const countTickets = async (filter: string): Promise<number> => {
      const rows = (await this.sp.web.lists
        .getByTitle(LISTS.TICKETS)
        .items.select('Id')
        .filter(filter)
        .top(5000)()) as { Id: number }[];
      return rows.length;
    };

    // Matches whatever department scope Knowledge Review is showing, or the
    // tile and the list underneath it will visibly disagree.
    const knowledgeFilter = team
      ? `ArticleStatus eq '${ARTICLE_STATUS.DRAFT}' and Department eq '${odataLiteral(team)}'`
      : `ArticleStatus eq '${ARTICLE_STATUS.DRAFT}'`;

    const [openOnMyTeam, newUnassigned, pendingEmployeeConfirmation, slaBreaching, knowledgeDraftsWaiting] =
      await Promise.all([
        countTickets(`${teamClause}Status ne '${TICKET_STATUS.CLOSED}'`),
        countTickets(`${teamClause}Status eq '${TICKET_STATUS.NEW}'`),
        countTickets(`${teamClause}Status eq '${TICKET_STATUS.PENDING_EMPLOYEE_CONFIRMATION}'`),
        countTickets(`${teamClause}${notTerminal} and SLADueDateTime lt '${nowIso}'`),
        (async () => {
          const rows = (await this.sp.web.lists
            .getByTitle(LISTS.KNOWLEDGE_ARTICLES)
            .items.select('Id')
            .filter(knowledgeFilter)
            .top(5000)()) as { Id: number }[];
          return rows.length;
        })(),
      ]);

    return { openOnMyTeam, newUnassigned, pendingEmployeeConfirmation, slaBreaching, knowledgeDraftsWaiting };
  }

  public async getCategories(): Promise<ICategory[]> {
    return this.sp.web.lists.getByTitle(LISTS.CATEGORIES).items.top(500)() as Promise<ICategory[]>;
  }

  public async getCallerProfile(actorEmail: string): Promise<{ userScope?: string }> {
    const key = normalizeEmail(actorEmail);
    let pending = this.profileCache.get(key);
    if (!pending) {
      pending = this.fetchCallerProfile(actorEmail);
      this.profileCache.set(key, pending);
      // A failed lookup must never stick - a one-off network blip shouldn't
      // downgrade someone to employee for the rest of the session.
      pending.catch(() => this.profileCache.delete(key));
    }
    return pending;
  }

  private async fetchCallerProfile(actorEmail: string): Promise<{ userScope?: string }> {
    // Select/read via USER_SCOPE_FIELD, not the literal 'UserScope' - see the
    // comment on that constant for why the live list's internal name differs
    // from its display name.
    const rows = (await this.sp.web.lists
      .getByTitle(LISTS.STAFF_DIRECTORY)
      .items.select('Id', 'Title', USER_SCOPE_FIELD)
      .filter(`Title eq '${odataLiteral(actorEmail)}'`)
      .top(5)()) as Array<{ Id: number } & Record<string, string>>;
    if (rows.length === 0) return { userScope: undefined };
    // Duplicate rows shouldn't silently first-win in whatever order the
    // server returns them - pick the lowest Id so it's at least consistent.
    const chosen = rows.reduce((lowest, row) => (row.Id < lowest.Id ? row : lowest));
    return { userScope: chosen[USER_SCOPE_FIELD] };
  }

  /**
   * Phase 5 guard for the three department-scoped writes - allows an admin
   * unconditionally (flagged as an override for the audit trail), staff
   * whose department matches the ticket's current owner team, and refuses
   * everyone else. Client-side only (see build_plan.md Phase 5) - a UX
   * guard, not real enforcement.
   */
  private async checkCanAct(ticket: ITicket, actorEmail: string): Promise<{ refusal?: IWriteResult; isAdminOverride: boolean }> {
    const { userScope } = await this.getCallerProfile(actorEmail);
    const role = deriveRole(userScope);
    if (role.kind === 'admin') return { isAdminOverride: true };
    if (role.kind === 'staff' && role.team === ticket.CurrentOwnerTeam) return { isAdminOverride: false };
    return { isAdminOverride: false, refusal: { success: false, message: REFUSAL.NOT_YOUR_DEPARTMENT } };
  }

  /** All write methods funnel their AuditLogs row through here. */
  private async writeAudit(ticketNumber: string, actionType: string, performedBy: string, details: string): Promise<void> {
    await this.sp.web.lists.getByTitle(LISTS.AUDIT_LOGS).items.add({
      TicketNumber: ticketNumber,
      ActionType: actionType,
      PerformedBy: performedBy,
      Details: details,
      EventTimestamp: new Date().toISOString(),
    });
  }

  public async updateTicketStatus(
    ticketNumber: string,
    newStatus: string,
    actorEmail: string,
    rootCause?: string,
    resolution?: string,
    reusableKnowledge?: string
  ): Promise<IWriteResult> {
    const ticket = await this.getTicketByNumber(ticketNumber);
    if (!ticket) return { success: false, message: `Ticket ${ticketNumber} not found.` };

    if (ticket.Status === TICKET_STATUS.CLOSED && newStatus !== TICKET_STATUS.REOPENED) {
      return { success: false, message: REFUSAL.TICKET_CLOSED };
    }

    const check = await this.checkCanAct(ticket, actorEmail);
    if (check.refusal) return check.refusal;

    const properties: Record<string, unknown> = {
      Status: newStatus,
      AssignedTo: actorEmail,
      // A background flow only re-fires employee confirmation when this is
      // empty - clearing it here is what lets a reopened-then-re-resolved
      // ticket ask the employee a second time. Easy to forget, do not drop.
      ClosureConfirmedBy: '',
    };
    if (rootCause !== undefined) properties.RootCause = rootCause;
    if (resolution !== undefined) properties.Resolution = resolution;
    if (reusableKnowledge !== undefined) properties.ReusableKnowledge = reusableKnowledge;

    // This only ever touches Tickets. Creating the KnowledgeArticles draft
    // when ReusableKnowledge becomes 'Yes' is a separate background flow's
    // job (the reference manual's GenerateKnowledgeDraft, outside this
    // codebase) - it is NOT this function's responsibility. Don't re-add it
    // here; see MockDataService for why sample-data mode still simulates it.
    await this.sp.web.lists.getByTitle(LISTS.TICKETS).items.getById(ticket.Id).update(properties);
    await this.writeAudit(
      ticketNumber,
      ACTION_TYPE.STATUS_CHANGED,
      actorEmail,
      `Status: ${ticket.Status} → ${newStatus}${check.isAdminOverride ? ' (admin override)' : ''}`
    );

    return { success: true };
  }

  public async reassignTicket(
    ticketNumber: string,
    newOwnerTeam: string,
    reason: string,
    actorEmail: string
  ): Promise<IWriteResult> {
    const ticket = await this.getTicketByNumber(ticketNumber);
    if (!ticket) return { success: false, message: `Ticket ${ticketNumber} not found.` };

    // Beyond the manual's own spec (which only guards UpdateTicketStatus) -
    // a deliberate decision to lock down all three actions once a ticket is
    // Closed, not just resolution.
    if (ticket.Status === TICKET_STATUS.CLOSED) {
      return { success: false, message: REFUSAL.TICKET_CLOSED };
    }

    const check = await this.checkCanAct(ticket, actorEmail);
    if (check.refusal) return check.refusal;

    await this.sp.web.lists
      .getByTitle(LISTS.TICKETS)
      .items.getById(ticket.Id)
      .update({ CurrentOwnerTeam: newOwnerTeam, ReassignReason: reason });

    await this.writeAudit(
      ticketNumber,
      ACTION_TYPE.REASSIGNED,
      actorEmail,
      `Owner: ${ticket.CurrentOwnerTeam} → ${newOwnerTeam}. Reason: ${reason}${check.isAdminOverride ? ' (admin override)' : ''}`
    );

    return { success: true };
  }

  public async addConcernedPerson(
    ticketNumber: string,
    personName: string,
    email: string,
    reason: string,
    actorEmail: string
  ): Promise<IWriteResult> {
    const ticket = await this.getTicketByNumber(ticketNumber);
    if (!ticket) return { success: false, message: `Ticket ${ticketNumber} not found.` };

    // Beyond the manual's own spec (which only guards UpdateTicketStatus) -
    // a deliberate decision to lock down all three actions once a ticket is
    // Closed, not just resolution.
    if (ticket.Status === TICKET_STATUS.CLOSED) {
      return { success: false, message: REFUSAL.TICKET_CLOSED };
    }

    const check = await this.checkCanAct(ticket, actorEmail);
    if (check.refusal) return check.refusal;

    await this.sp.web.lists.getByTitle(LISTS.TICKET_PARTICIPANTS).items.add({
      TicketNumber: ticketNumber,
      PersonName: personName,
      Email: email,
      Role: PARTICIPANT_ROLE.CONCERNED,
      Reason: reason,
      AddedBy: actorEmail,
      AddedDate: new Date().toISOString(),
      NotificationSent: false,
    });

    await this.writeAudit(
      ticketNumber,
      ACTION_TYPE.CONCERNED_PERSON_ADDED,
      actorEmail,
      `Added ${personName} (${email}). ${reason}${check.isAdminOverride ? ' (admin override)' : ''}`
    );

    return { success: true };
  }

  public async publishKnowledgeArticle(input: IPublishKnowledgeArticleInput, actorEmail: string): Promise<IWriteResult> {
    const articleRows = (await this.sp.web.lists
      .getByTitle(LISTS.KNOWLEDGE_ARTICLES)
      .items.select('Id', 'Department')
      .filter(`Id eq ${input.articleId}`)
      .top(1)()) as { Id: number; Department: string }[];
    const article = articleRows[0];
    if (!article) return { success: false, message: `Knowledge article ${input.articleId} not found.` };

    // A draft can only be published once its source ticket is confirmed
    // fixed - publishing earlier risks publishing a "solution" that the
    // requester later says didn't work, reopening the ticket.
    const ticket = input.sourceTicket ? await this.getTicketByNumber(input.sourceTicket) : undefined;
    if (ticket && ticket.Status !== TICKET_STATUS.CLOSED) {
      return { success: false, message: REFUSAL.ARTICLE_NOT_CLOSED };
    }

    const { userScope } = await this.getCallerProfile(actorEmail);
    const role = deriveRole(userScope);
    const department = ticket ? ticket.CurrentOwnerTeam : article.Department;
    const isAdminOverride = role.kind === 'admin';
    if (!isAdminOverride && !(role.kind === 'staff' && role.team === department)) {
      return { success: false, message: REFUSAL.NOT_YOUR_DEPARTMENT };
    }

    await this.sp.web.lists
      .getByTitle(LISTS.KNOWLEDGE_ARTICLES)
      .items.getById(input.articleId)
      .update({
        Title: input.title,
        ProblemDescription: input.problemDescription,
        Symptoms: input.symptoms,
        RootCause: input.rootCause,
        Resolution: input.resolution,
        Keywords: input.keywords,
        SourceTicket: input.sourceTicket,
        ArticleStatus: ARTICLE_STATUS.PUBLISHED,
        ReviewedBy: actorEmail,
        ReviewDate: new Date().toISOString(),
      });

    // Links the source ticket back to the article it produced, so a
    // ticket's detail view can show/open the resulting KB article.
    if (ticket) {
      await this.sp.web.lists.getByTitle(LISTS.TICKETS).items.getById(ticket.Id).update({ KnowledgeArticleId: String(input.articleId) });
    }

    await this.writeAudit(
      input.sourceTicket || '',
      ACTION_TYPE.KNOWLEDGE_PUBLISHED,
      actorEmail,
      `Published knowledge article: ${input.title}${isAdminOverride ? ' (admin override)' : ''}`
    );

    return { success: true };
  }

  /**
   * Console equivalent of the Copilot agent's CreateTicket flow - same
   * Counters-based numbering, same Tickets fields, same audit row. Two
   * channels write the same lists, so they must stay in lockstep.
   *
   * Known POC-scale gap (per the reference manual): reading then writing the
   * counter isn't atomic, so two submissions at the exact same instant could
   * race. Mitigate by turning on "Enforce unique values" on the Tickets
   * list's TicketNumber column (a one-time SharePoint list setting, not
   * something this code can do) so a collision fails loudly instead of
   * silently duplicating a number.
   */
  public async createTicket(input: ICreateTicketInput): Promise<ICreateTicketResult> {
    // Own-department refusal, enforced here too (not just the form's
    // dropdown filter), so the rule holds even if the UI is ever wrong.
    const { userScope } = await this.getCallerProfile(input.requesterEmail);
    const role = deriveRole(userScope);
    if (role.kind === 'staff' && role.team === input.department) {
      return { success: false, message: REFUSAL.OWN_DEPARTMENT_RAISE };
    }

    const counterRows = (await this.sp.web.lists
      .getByTitle(LISTS.COUNTERS)
      .items.select('Id', 'LastNumber')
      .filter(`Title eq '${odataLiteral(input.department)}'`)
      .top(1)()) as { Id: number; LastNumber: number }[];
    const counter = counterRows[0];
    if (!counter) return { success: false, message: `No ticket counter configured for department "${input.department}".` };

    const nextNumber = counter.LastNumber + 1;
    await this.sp.web.lists.getByTitle(LISTS.COUNTERS).items.getById(counter.Id).update({ LastNumber: nextNumber });

    const ticketNumber = formatTicketNumber(input.department, nextNumber);
    const title = input.description.length > 80 ? `${input.description.slice(0, 80)}…` : input.description;
    const slaHours = SLA_HOURS_BY_PRIORITY[input.priority] || 24;

    await this.sp.web.lists.getByTitle(LISTS.TICKETS).items.add({
      Title: title,
      TicketNumber: ticketNumber,
      Description: input.description,
      Department: input.department,
      CurrentOwnerTeam: input.department,
      Category: input.category,
      Priority: input.priority,
      Status: TICKET_STATUS.NEW,
      RequesterEmail: input.requesterEmail,
      RequesterName: input.requesterName,
      SLADueDateTime: new Date(Date.now() + slaHours * 3600_000).toISOString(),
      TicketCreatedDate: new Date().toISOString(),
      ReusableKnowledge: 'No',
    });

    await this.writeAudit(
      ticketNumber,
      ACTION_TYPE.TICKET_CREATED,
      input.requesterEmail,
      `Ticket created via console. Department: ${input.department} / Category: ${input.category} / Priority: ${input.priority}`
    );

    return { success: true, ticketNumber };
  }
}
