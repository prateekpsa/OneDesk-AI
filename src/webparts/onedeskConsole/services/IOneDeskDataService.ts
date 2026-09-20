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

export interface ITicketFilter {
  status?: string;
  team?: string;
  requesterEmail?: string;
}

export interface IKnowledgeArticleFilter {
  articleStatus?: string;
  department?: string;
}

/**
 * Read + write service layer. Both SharePointDataService and MockDataService
 * implement this - components only ever depend on this interface, never on
 * either implementation directly, so swapping between live SharePoint and
 * seeded mock data is a one-line change (see OnedeskConsole.tsx's useMemo).
 */
export interface IOneDeskDataService {
  // Reads (Phase 2)
  getTickets(filter?: ITicketFilter): Promise<ITicket[]>;
  getTicketByNumber(ticketNumber: string): Promise<ITicket | undefined>;
  getParticipants(ticketNumber: string): Promise<IParticipant[]>;
  getAuditLog(ticketNumber: string): Promise<IAuditLogEntry[]>;
  getKnowledgeArticles(filter?: IKnowledgeArticleFilter): Promise<IKnowledgeArticle[]>;
  getCommittees(): Promise<ICommittee[]>;
  /** `team` undefined means every department (the admin "All departments" view). */
  getDashboardCounts(team?: string): Promise<IDashboardCounts>;
  getCategories(): Promise<ICategory[]>;

  /**
   * Tickets someone was added to as a participant (Concerned/Watcher/
   * Approver) - the "Shared with me" tab, and the only way such a ticket is
   * reachable, since it's neither the person's own nor their department's.
   */
  getTicketsForParticipant(email: string): Promise<ITicket[]>;

  /**
   * Phase 5's role lookup - looks up actorEmail in StaffDirectory, returns
   * their UserScope (or undefined if not found, i.e. a regular employee).
   * Client-side only, so this is a UX guard, not a real security boundary -
   * see build_plan.md Phase 5.
   */
  getCallerProfile(actorEmail: string): Promise<{ userScope?: string }>;

  // Writes (Phase 3) - each also writes an AuditLogs row on success.
  updateTicketStatus(
    ticketNumber: string,
    newStatus: string,
    actorEmail: string,
    rootCause?: string,
    resolution?: string,
    reusableKnowledge?: string
  ): Promise<IWriteResult>;
  reassignTicket(ticketNumber: string, newOwnerTeam: string, reason: string, actorEmail: string): Promise<IWriteResult>;
  addConcernedPerson(
    ticketNumber: string,
    personName: string,
    email: string,
    reason: string,
    actorEmail: string
  ): Promise<IWriteResult>;
  publishKnowledgeArticle(input: IPublishKnowledgeArticleInput, actorEmail: string): Promise<IWriteResult>;

  /**
   * Phase 6 (build_plan.md) - employee self-service. Generates the next
   * PSDESK-{DEPT}-{6 digits} number from Counters, creates the Tickets row,
   * and writes a TicketCreated audit entry - the console's equivalent of the
   * Copilot agent's CreateTicket flow, writing to the same lists.
   */
  createTicket(input: ICreateTicketInput): Promise<ICreateTicketResult>;
}
