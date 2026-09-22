import { ITicket } from '../models/ITicket';
import { TICKET_STATUS, SLA_HOURS_BY_PRIORITY } from '../services/config';
import type { SlaState } from '../components/ui/statusTone';

export type { SlaState };

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

/**
 * Whole days elapsed since TicketCreatedDate (not SharePoint's Modified),
 * so a system-account edit never shifts a ticket's age. undefined for a
 * ticket with no TicketCreatedDate, same as isBreached does for a missing
 * SLADueDateTime, rather than letting an Invalid Date poison a bucket count.
 */
export function getAgeInDays(ticket: ITicket): number | undefined {
  if (!ticket.TicketCreatedDate) return undefined;
  const created = new Date(ticket.TicketCreatedDate).getTime();
  return Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
}

/** Single classification used by SlaPill and the Queue/Dashboard "breaching" tallies. */
export function getSlaState(ticket: ITicket): SlaState {
  if (isTerminal(ticket.Status)) return 'closed';
  if (!ticket.SLADueDateTime) return 'unknown';
  if (isBreached(ticket)) return 'breached';
  if (isCloseToBreaching(ticket)) return 'dueSoon';
  return 'onTrack';
}

const SLA_LABEL: Record<SlaState, string> = {
  closed: 'Closed',
  breached: 'SLA breached',
  dueSoon: 'Due soon',
  onTrack: 'On track',
  unknown: 'No SLA'
};

/** The text that goes with getSlaState()'s tone — passed to the kit's <SlaPill label>. */
export function slaLabel(ticket: ITicket): string {
  return SLA_LABEL[getSlaState(ticket)];
}
