/** Mirrors the AuditLogs list schema. */
export interface IAuditLogEntry {
  Id: number;
  TicketNumber: string;
  ActionType: string;
  PerformedBy: string;
  Details?: string;
  EventTimestamp: string;
}
