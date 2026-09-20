/** Mirrors the TicketParticipants list schema. */
export interface IParticipant {
  Id: number;
  TicketNumber: string;
  PersonName: string;
  Email: string;
  Role: string;
  Reason?: string;
  AddedBy: string;
  AddedDate: string;
  NotificationSent: boolean;
}
