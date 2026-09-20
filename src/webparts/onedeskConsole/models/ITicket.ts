/** Mirrors the Tickets list schema (build_plan.md Phase 1 SharePoint schema, 20 columns). */
export interface ITicket {
  Id: number;
  Title: string;
  TicketNumber: string;
  Description?: string;
  Department: string;
  CurrentOwnerTeam: string;
  Category?: string;
  Priority: string;
  Status: string;
  RequesterEmail: string;
  RequesterName: string;
  AssignedTo?: string;
  RootCause?: string;
  Resolution?: string;
  ReusableKnowledge?: string;
  KnowledgeArticleId?: string;
  SLADueDateTime?: string;
  TicketCreatedDate?: string;
  ClosedDate?: string;
  ClosureConfirmedBy?: string;
  ReassignReason?: string;
  /** SharePoint's system last-modified timestamp - used to sort the Queue. Not present on mock tickets. */
  Modified?: string;
}
