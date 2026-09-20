import { IWriteResult } from './IWriteResult';

/** createTicket's result - carries the generated ticket number back on success. */
export interface ICreateTicketResult extends IWriteResult {
  ticketNumber?: string;
}
