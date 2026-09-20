import { IOneDeskDataService, ITicketFilter, IKnowledgeArticleFilter } from './IOneDeskDataService';
import { ITicket } from '../models/ITicket';
import { IParticipant } from '../models/IParticipant';
import { IKnowledgeArticle } from '../models/IKnowledgeArticle';
import { ICommittee } from '../models/ICommittee';
import { ICategory } from '../models/ICategory';
import { IAuditLogEntry } from '../models/IAuditLogEntry';
import { IDashboardCounts } from '../models/IDashboardCounts';
import { IWriteResult } from '../models/IWriteResult';
import { IPublishKnowledgeArticleInput } from '../models/IPublishKnowledgeArticleInput';
import { ICreateTicketInput } from '../models/ICreateTicketInput';
import { ICreateTicketResult } from '../models/ICreateTicketResult';
import {
  TICKET_STATUS,
  PRIORITY,
  TEAM,
  ARTICLE_STATUS,
  PARTICIPANT_ROLE,
  ACTION_TYPE,
  SLA_HOURS_BY_PRIORITY,
  USER_SCOPE,
  REFUSAL,
  formatTicketNumber,
  normalizeEmail,
  deriveRole,
} from './config';

const hoursAgo = (h: number): string => new Date(Date.now() - h * 3600_000).toISOString();
const hoursFromNow = (h: number): string => new Date(Date.now() + h * 3600_000).toISOString();

/** Local/workbench dev data - lets the UI be built and demoed without touching live SharePoint. */
const MOCK_TICKETS: ITicket[] = [
  {
    Id: 1,
    Title: 'VPN keeps disconnecting',
    TicketNumber: 'PSDESK-IT-000001',
    Description: 'VPN drops every 10 minutes while working from home.',
    Department: TEAM.IT,
    CurrentOwnerTeam: TEAM.IT,
    Category: 'VPN',
    Priority: PRIORITY.HIGH,
    Status: TICKET_STATUS.IN_PROGRESS,
    RequesterEmail: 'asha.mehta@preferredsquare.com',
    RequesterName: 'Asha Mehta',
    AssignedTo: 'it.agent@preferredsquare.com',
    SLADueDateTime: hoursAgo(1), // deliberately breached, for SLA-pill testing
    TicketCreatedDate: hoursAgo(9),
  },
  {
    Id: 2,
    Title: 'Need Power BI access',
    TicketNumber: 'PSDESK-IT-000002',
    Description: 'Requesting Power BI Pro licence for reporting.',
    Department: TEAM.IT,
    CurrentOwnerTeam: TEAM.IT,
    Category: 'Power BI',
    Priority: PRIORITY.MEDIUM,
    Status: TICKET_STATUS.NEW,
    RequesterEmail: 'ravi.kumar@preferredsquare.com',
    RequesterName: 'Ravi Kumar',
    SLADueDateTime: hoursFromNow(20),
    TicketCreatedDate: hoursAgo(4),
  },
  {
    Id: 3,
    Title: 'Leave balance query',
    TicketNumber: 'PSDESK-HR-000001',
    Description: 'Leave balance shows incorrect count for this quarter.',
    Department: TEAM.HR,
    CurrentOwnerTeam: TEAM.HR,
    Category: 'Leave / Attendance',
    Priority: PRIORITY.LOW,
    Status: TICKET_STATUS.PENDING_EMPLOYEE_CONFIRMATION,
    RequesterEmail: 'meera.iyer@preferredsquare.com',
    RequesterName: 'Meera Iyer',
    AssignedTo: 'hr.agent@preferredsquare.com',
    Resolution: 'Corrected the leave ledger entry.',
    RootCause: 'Manual entry error during migration.',
    SLADueDateTime: hoursFromNow(30),
    TicketCreatedDate: hoursAgo(20),
  },
  {
    Id: 4,
    Title: 'Laptop request for new joiner',
    TicketNumber: 'PSDESK-ADMIN-000001',
    Description: 'New joiner starting Monday needs a laptop assigned.',
    Department: TEAM.ADMIN,
    CurrentOwnerTeam: TEAM.ADMIN,
    Category: 'Asset Request',
    Priority: PRIORITY.MEDIUM,
    Status: TICKET_STATUS.CLOSED,
    RequesterEmail: 'hr.ops@preferredsquare.com',
    RequesterName: 'HR Ops',
    AssignedTo: 'admin.agent@preferredsquare.com',
    Resolution: 'Laptop issued and configured.',
    RootCause: 'Routine onboarding request.',
    ReusableKnowledge: 'Yes',
    SLADueDateTime: hoursAgo(30),
    TicketCreatedDate: hoursAgo(50),
    ClosedDate: hoursAgo(2),
  },
];

const MOCK_PARTICIPANTS: IParticipant[] = [
  {
    Id: 1,
    TicketNumber: 'PSDESK-IT-000001',
    PersonName: 'Network Team Lead',
    Email: 'network.lead@preferredsquare.com',
    Role: PARTICIPANT_ROLE.CONCERNED,
    Reason: 'May need to check firewall rules.',
    AddedBy: 'it.agent@preferredsquare.com',
    AddedDate: hoursAgo(5),
    NotificationSent: false,
  },
  {
    Id: 2,
    TicketNumber: 'PSDESK-HR-000001',
    PersonName: 'You (demo)',
    // Stamped to the signed-in tester's email in the constructor, same
    // pattern as MOCK_TICKETS[0], so "Shared with me" has something to show.
    Email: 'demo.viewer@preferredsquare.com',
    Role: PARTICIPANT_ROLE.WATCHER,
    Reason: 'Added for the "Shared with me" demo.',
    AddedBy: 'hr.agent@preferredsquare.com',
    AddedDate: hoursAgo(3),
    NotificationSent: false,
  },
];

const MOCK_AUDIT_LOG: IAuditLogEntry[] = [
  {
    Id: 1,
    TicketNumber: 'PSDESK-IT-000001',
    ActionType: ACTION_TYPE.TICKET_CREATED,
    PerformedBy: 'asha.mehta@preferredsquare.com',
    Details: 'Ticket created via agent.',
    EventTimestamp: hoursAgo(9),
  },
  {
    Id: 2,
    TicketNumber: 'PSDESK-IT-000001',
    ActionType: ACTION_TYPE.STATUS_CHANGED,
    PerformedBy: 'it.agent@preferredsquare.com',
    Details: 'Status: New → In Progress',
    EventTimestamp: hoursAgo(8),
  },
];

const MOCK_KNOWLEDGE_ARTICLES: IKnowledgeArticle[] = [
  {
    Id: 1,
    Title: 'VPN Troubleshooting Guide',
    Department: TEAM.IT,
    Category: 'VPN',
    ProblemDescription: 'VPN disconnects intermittently.',
    Symptoms: 'Drops every 10-15 minutes.',
    RootCause: 'Stale DNS cache on client.',
    Resolution: 'Flush DNS and reconnect using the split-tunnel profile.',
    Keywords: 'vpn, disconnect, network',
    ArticleOwner: 'it.agent@preferredsquare.com',
    ArticleStatus: ARTICLE_STATUS.PUBLISHED,
  },
  {
    Id: 2,
    Title: 'Laptop Onboarding Checklist',
    Department: TEAM.ADMIN,
    Category: 'Asset Request',
    ProblemDescription: 'New joiner laptop setup.',
    Resolution: 'Standard imaging + account provisioning steps.',
    Keywords: 'laptop, onboarding, asset',
    ArticleOwner: 'admin.agent@preferredsquare.com',
    ArticleStatus: ARTICLE_STATUS.DRAFT,
    SourceTicket: 'PSDESK-ADMIN-000001',
  },
];

const MOCK_CATEGORIES: ICategory[] = [
  { Id: 1, Department: TEAM.IT, CategoryName: 'Hardware' },
  { Id: 2, Department: TEAM.IT, CategoryName: 'Software / Access' },
  { Id: 3, Department: TEAM.IT, CategoryName: 'Network / VPN' },
  { Id: 4, Department: TEAM.IT, CategoryName: 'Reporting / Power BI' },
  { Id: 5, Department: TEAM.HR, CategoryName: 'Policy Question' },
  { Id: 6, Department: TEAM.HR, CategoryName: 'Leave / Attendance' },
  { Id: 7, Department: TEAM.HR, CategoryName: 'Payroll Query' },
  { Id: 8, Department: TEAM.ADMIN, CategoryName: 'Facilities' },
  { Id: 9, Department: TEAM.ADMIN, CategoryName: 'Asset Request' },
  { Id: 10, Department: TEAM.ADMIN, CategoryName: 'Travel / Transport' },
];

/** Mirrors the Counters list (Title = department, LastNumber) - matches MOCK_TICKETS' existing numbers. */
const MOCK_COUNTERS: Record<string, number> = {
  [TEAM.IT]: 2,
  [TEAM.HR]: 1,
  [TEAM.ADMIN]: 1,
};

const MOCK_COMMITTEES: ICommittee[] = [
  { Id: 1, CommitteeName: 'POSH', CoordinatorEmail: 'posh.committee@preferredsquare.com' },
  { Id: 2, CommitteeName: 'CSR', CoordinatorEmail: 'csr.committee@preferredsquare.com' },
  { Id: 3, CommitteeName: 'JASHN', CoordinatorEmail: 'jashn.committee@preferredsquare.com' },
  { Id: 4, CommitteeName: 'Cricket', CoordinatorEmail: 'cricket.committee@preferredsquare.com' },
  { Id: 5, CommitteeName: 'Volleyball', CoordinatorEmail: 'volleyball.committee@preferredsquare.com' },
  { Id: 6, CommitteeName: 'Badminton', CoordinatorEmail: 'badminton.committee@preferredsquare.com' },
];

function isTerminalStatus(status: string): boolean {
  return status === TICKET_STATUS.CLOSED || status === TICKET_STATUS.RESOLVED || status === TICKET_STATUS.CANCELLED;
}

export class MockDataService implements IOneDeskDataService {
  /**
   * Local stand-in for the StaffDirectory list (Phase 5's role model),
   * keyed by normalized email, holding UserScope values directly - one of
   * each kind, so every role is exercisable in sample-data mode.
   */
  private staffDirectory: Record<string, string>;

  /**
   * `simulatedScope`, when set, overrides the *signed-in tester's own*
   * role - it never affects lookups of other seeded emails (e.g. via User
   * Lookup), only `currentUserEmail`. Only ever passed when the web part's
   * useMockData toggle is on - see OnedeskConsoleWebPart.ts.
   */
  constructor(private currentUserEmail?: string, private simulatedScope?: string) {
    this.staffDirectory = {
      'it.agent@preferredsquare.com': USER_SCOPE.IT,
      'hr.agent@preferredsquare.com': USER_SCOPE.HR,
      'admin.agent@preferredsquare.com': USER_SCOPE.ADMIN,
      'analytics.agent@preferredsquare.com': USER_SCOPE.ANALYTICS,
      'finance.agent@preferredsquare.com': USER_SCOPE.FINANCE,
      'super.admin@preferredsquare.com': USER_SCOPE.SUPER_ADMIN,
    };

    // Stamped once here (not on every getTickets/getTicketByNumber call) so
    // the two methods can never disagree about who requested this ticket.
    if (this.currentUserEmail) {
      MOCK_TICKETS[0] = { ...MOCK_TICKETS[0], RequesterEmail: this.currentUserEmail };
      MOCK_PARTICIPANTS[1] = { ...MOCK_PARTICIPANTS[1], Email: this.currentUserEmail };
    }
  }

  public async getCallerProfile(actorEmail: string): Promise<{ userScope?: string }> {
    const isSelf = !!this.currentUserEmail && normalizeEmail(actorEmail) === normalizeEmail(this.currentUserEmail);
    if (isSelf && this.simulatedScope !== undefined) {
      return { userScope: this.simulatedScope || undefined };
    }
    return { userScope: this.staffDirectory[normalizeEmail(actorEmail)] };
  }

  /** Mirrors SharePointDataService.checkCanAct - see build_plan.md Phase 5. */
  private async checkCanAct(ticket: ITicket, actorEmail: string): Promise<{ refusal?: IWriteResult; isAdminOverride: boolean }> {
    const { userScope } = await this.getCallerProfile(actorEmail);
    const role = deriveRole(userScope);
    if (role.kind === 'admin') return { isAdminOverride: true };
    if (role.kind === 'staff' && role.team === ticket.CurrentOwnerTeam) return { isAdminOverride: false };
    return { isAdminOverride: false, refusal: { success: false, message: REFUSAL.NOT_YOUR_DEPARTMENT } };
  }

  public async getTickets(filter?: ITicketFilter): Promise<ITicket[]> {
    return MOCK_TICKETS.filter(
      (t) =>
        (!filter?.status || t.Status === filter.status) &&
        (!filter?.team || t.CurrentOwnerTeam === filter.team) &&
        (!filter?.requesterEmail || t.RequesterEmail === filter.requesterEmail)
    );
  }

  public async getTicketByNumber(ticketNumber: string): Promise<ITicket | undefined> {
    return MOCK_TICKETS.find((t) => t.TicketNumber === ticketNumber);
  }

  public async getParticipants(ticketNumber: string): Promise<IParticipant[]> {
    return MOCK_PARTICIPANTS.filter((p) => p.TicketNumber === ticketNumber);
  }

  public async getTicketsForParticipant(email: string): Promise<ITicket[]> {
    const numbers = new Set(
      MOCK_PARTICIPANTS.filter((p) => normalizeEmail(p.Email) === normalizeEmail(email)).map((p) => p.TicketNumber)
    );
    return MOCK_TICKETS.filter((t) => numbers.has(t.TicketNumber));
  }

  public async getAuditLog(ticketNumber: string): Promise<IAuditLogEntry[]> {
    return MOCK_AUDIT_LOG.filter((a) => a.TicketNumber === ticketNumber);
  }

  public async getKnowledgeArticles(filter?: IKnowledgeArticleFilter): Promise<IKnowledgeArticle[]> {
    return MOCK_KNOWLEDGE_ARTICLES.filter(
      (a) =>
        (!filter?.articleStatus || a.ArticleStatus === filter.articleStatus) &&
        (!filter?.department || a.Department === filter.department)
    );
  }

  public async getCommittees(): Promise<ICommittee[]> {
    return MOCK_COMMITTEES;
  }

  public async getDashboardCounts(team?: string): Promise<IDashboardCounts> {
    const teamTickets = team ? MOCK_TICKETS.filter((t) => t.CurrentOwnerTeam === team) : MOCK_TICKETS;
    const now = Date.now();
    const drafts = MOCK_KNOWLEDGE_ARTICLES.filter(
      (a) => a.ArticleStatus === ARTICLE_STATUS.DRAFT && (!team || a.Department === team)
    );

    return {
      openOnMyTeam: teamTickets.filter((t) => t.Status !== TICKET_STATUS.CLOSED).length,
      newUnassigned: teamTickets.filter((t) => t.Status === TICKET_STATUS.NEW).length,
      pendingEmployeeConfirmation: teamTickets.filter((t) => t.Status === TICKET_STATUS.PENDING_EMPLOYEE_CONFIRMATION)
        .length,
      // Excludes every terminal status, not just Closed - a Resolved or
      // Cancelled ticket isn't "at risk" any more than a Closed one is.
      slaBreaching: teamTickets.filter(
        (t) => !isTerminalStatus(t.Status) && t.SLADueDateTime && new Date(t.SLADueDateTime).getTime() < now
      ).length,
      knowledgeDraftsWaiting: drafts.length,
    };
  }

  private nextId(rows: { Id: number }[]): number {
    return Math.max(0, ...rows.map((r) => r.Id)) + 1;
  }

  private addAudit(ticketNumber: string, actionType: string, performedBy: string, details: string): void {
    MOCK_AUDIT_LOG.push({
      Id: this.nextId(MOCK_AUDIT_LOG),
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
    const index = MOCK_TICKETS.findIndex((t) => t.TicketNumber === ticketNumber);
    if (index === -1) return { success: false, message: `Ticket ${ticketNumber} not found.` };

    const ticket = MOCK_TICKETS[index];
    if (ticket.Status === TICKET_STATUS.CLOSED && newStatus !== TICKET_STATUS.REOPENED) {
      return { success: false, message: REFUSAL.TICKET_CLOSED };
    }

    const check = await this.checkCanAct(ticket, actorEmail);
    if (check.refusal) return check.refusal;

    const oldStatus = ticket.Status;
    MOCK_TICKETS[index] = {
      ...MOCK_TICKETS[index],
      Status: newStatus,
      AssignedTo: actorEmail,
      ClosureConfirmedBy: '',
      ...(rootCause !== undefined ? { RootCause: rootCause } : {}),
      ...(resolution !== undefined ? { Resolution: resolution } : {}),
      ...(reusableKnowledge !== undefined ? { ReusableKnowledge: reusableKnowledge } : {}),
    };

    this.addAudit(
      ticketNumber,
      ACTION_TYPE.STATUS_CHANGED,
      actorEmail,
      `Status: ${oldStatus} → ${newStatus}${check.isAdminOverride ? ' (admin override)' : ''}`
    );

    // The real SharePointDataService no longer does this - creating the
    // KnowledgeArticles draft is a separate background flow's job. There's
    // no real flow to run against sample data though, so this simulates
    // it here ONLY, using CurrentOwnerTeam (whoever resolved it), not
    // Department (whoever it started with).
    if (reusableKnowledge === 'Yes' && !ticket.KnowledgeArticleId) {
      const newArticleId = this.nextId(MOCK_KNOWLEDGE_ARTICLES);
      MOCK_KNOWLEDGE_ARTICLES.push({
        Id: newArticleId,
        Title: ticket.Title,
        Department: ticket.CurrentOwnerTeam,
        Category: ticket.Category,
        ProblemDescription: ticket.Description,
        RootCause: rootCause,
        Resolution: resolution,
        SourceTicket: ticketNumber,
        ArticleOwner: actorEmail,
        ArticleStatus: ARTICLE_STATUS.DRAFT,
      });
      MOCK_TICKETS[index] = { ...MOCK_TICKETS[index], KnowledgeArticleId: String(newArticleId) };
      this.addAudit(ticketNumber, ACTION_TYPE.KNOWLEDGE_DRAFTED, actorEmail, `Draft knowledge article created: ${ticket.Title}`);
    }

    return { success: true };
  }

  public async reassignTicket(
    ticketNumber: string,
    newOwnerTeam: string,
    reason: string,
    actorEmail: string
  ): Promise<IWriteResult> {
    const index = MOCK_TICKETS.findIndex((t) => t.TicketNumber === ticketNumber);
    if (index === -1) return { success: false, message: `Ticket ${ticketNumber} not found.` };

    // Beyond the manual's own spec (which only guards UpdateTicketStatus) -
    // a deliberate decision to lock down all three actions once a ticket is
    // Closed, not just resolution.
    if (MOCK_TICKETS[index].Status === TICKET_STATUS.CLOSED) {
      return { success: false, message: REFUSAL.TICKET_CLOSED };
    }

    const check = await this.checkCanAct(MOCK_TICKETS[index], actorEmail);
    if (check.refusal) return check.refusal;

    const oldTeam = MOCK_TICKETS[index].CurrentOwnerTeam;
    MOCK_TICKETS[index] = { ...MOCK_TICKETS[index], CurrentOwnerTeam: newOwnerTeam, ReassignReason: reason };

    this.addAudit(
      ticketNumber,
      ACTION_TYPE.REASSIGNED,
      actorEmail,
      `Owner: ${oldTeam} → ${newOwnerTeam}. Reason: ${reason}${check.isAdminOverride ? ' (admin override)' : ''}`
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
    const ticket = MOCK_TICKETS.find((t) => t.TicketNumber === ticketNumber);
    if (!ticket) return { success: false, message: `Ticket ${ticketNumber} not found.` };

    // Beyond the manual's own spec (which only guards UpdateTicketStatus) -
    // a deliberate decision to lock down all three actions once a ticket is
    // Closed, not just resolution.
    if (ticket.Status === TICKET_STATUS.CLOSED) {
      return { success: false, message: REFUSAL.TICKET_CLOSED };
    }

    const check = await this.checkCanAct(ticket, actorEmail);
    if (check.refusal) return check.refusal;

    MOCK_PARTICIPANTS.push({
      Id: this.nextId(MOCK_PARTICIPANTS),
      TicketNumber: ticketNumber,
      PersonName: personName,
      Email: email,
      Role: PARTICIPANT_ROLE.CONCERNED,
      Reason: reason,
      AddedBy: actorEmail,
      AddedDate: new Date().toISOString(),
      NotificationSent: false,
    });

    this.addAudit(
      ticketNumber,
      ACTION_TYPE.CONCERNED_PERSON_ADDED,
      actorEmail,
      `Added ${personName} (${email}). ${reason}${check.isAdminOverride ? ' (admin override)' : ''}`
    );
    return { success: true };
  }

  public async publishKnowledgeArticle(input: IPublishKnowledgeArticleInput, actorEmail: string): Promise<IWriteResult> {
    const index = MOCK_KNOWLEDGE_ARTICLES.findIndex((a) => a.Id === input.articleId);
    if (index === -1) return { success: false, message: `Knowledge article ${input.articleId} not found.` };
    const article = MOCK_KNOWLEDGE_ARTICLES[index];

    const ticket = input.sourceTicket ? MOCK_TICKETS.find((t) => t.TicketNumber === input.sourceTicket) : undefined;
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

    MOCK_KNOWLEDGE_ARTICLES[index] = {
      ...MOCK_KNOWLEDGE_ARTICLES[index],
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
    };

    if (ticket) {
      const ticketIndex = MOCK_TICKETS.findIndex((t) => t.TicketNumber === input.sourceTicket);
      MOCK_TICKETS[ticketIndex] = { ...MOCK_TICKETS[ticketIndex], KnowledgeArticleId: String(input.articleId) };
    }

    this.addAudit(
      input.sourceTicket || '',
      ACTION_TYPE.KNOWLEDGE_PUBLISHED,
      actorEmail,
      `Published knowledge article: ${input.title}${isAdminOverride ? ' (admin override)' : ''}`
    );
    return { success: true };
  }

  public async getCategories(): Promise<ICategory[]> {
    return MOCK_CATEGORIES;
  }

  /** Mirrors SharePointDataService.createTicket - see build_plan.md Phase 6. */
  public async createTicket(input: ICreateTicketInput): Promise<ICreateTicketResult> {
    const { userScope } = await this.getCallerProfile(input.requesterEmail);
    const role = deriveRole(userScope);
    if (role.kind === 'staff' && role.team === input.department) {
      return { success: false, message: REFUSAL.OWN_DEPARTMENT_RAISE };
    }

    if (!(input.department in MOCK_COUNTERS)) {
      return { success: false, message: `No ticket counter configured for department "${input.department}".` };
    }

    const nextNumber = MOCK_COUNTERS[input.department] + 1;
    MOCK_COUNTERS[input.department] = nextNumber;

    const ticketNumber = formatTicketNumber(input.department, nextNumber);
    const title = input.description.length > 80 ? `${input.description.slice(0, 80)}…` : input.description;
    const slaHours = SLA_HOURS_BY_PRIORITY[input.priority] || 24;

    MOCK_TICKETS.push({
      Id: this.nextId(MOCK_TICKETS),
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

    this.addAudit(
      ticketNumber,
      ACTION_TYPE.TICKET_CREATED,
      input.requesterEmail,
      `Ticket created via console. Department: ${input.department} / Category: ${input.category} / Priority: ${input.priority}`
    );

    return { success: true, ticketNumber };
  }
}
