/** Mirrors the Committees list schema. */
export interface ICommittee {
  Id: number;
  CommitteeName: string;
  Description?: string;
  CoordinatorEmail?: string;
  ContactEmail?: string;
  JoinProcess?: string;
  UpcomingEvents?: string;
}
