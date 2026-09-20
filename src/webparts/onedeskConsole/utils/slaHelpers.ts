import { ITicket } from '../models/ITicket';
import { TICKET_STATUS, SLA_HOURS_BY_PRIORITY } from '../services/config';

export type SlaState = 'closed' | 'breached' | 'warning' | 'ontrack' | 'unknown';

/** Fraction of a priority's SLA window, counted back from the due time, that counts as "close to breaching". */
const WARNING_BUFFER_FRACTION = 0.25;

function isTerminal(status: string): boolean {
  return status === TICKET_STATUS.CLOSED || status === TICKET_STATUS.RESOLVED || status === TICKET_STATUS.CANCELLED;
}

export function isBreached(ticket: ITicket): boolean {
  if (isTerminal(ticket.Status) || !ticket.SLADueDateTime) return false;
  return new Date(ticket.SLADueDateTime).getTime() < Date.now();
}

export function isCloseToBreaching(ticket: ITicket): boolean {
  if (isTerminal(ticket.Status) || !ticket.SLADueDateTime || isBreached(ticket)) return false;
  const dueMs = new Date(ticket.SLADueDateTime).getTime();
  const windowHours = SLA_HOURS_BY_PRIORITY[ticket.Priority] || 24;
  const bufferMs = windowHours * 3600_000 * WARNING_BUFFER_FRACTION;
  return dueMs - Date.now() <= bufferMs;
}

/** Single classification used by SlaPill and the Queue/Dashboard "breaching" tallies. */
export function getSlaState(ticket: ITicket): SlaState {
  if (isTerminal(ticket.Status)) return 'closed';
  if (!ticket.SLADueDateTime) return 'unknown';
  if (isBreached(ticket)) return 'breached';
  if (isCloseToBreaching(ticket)) return 'warning';
  return 'ontrack';
}
