import { PillTone } from './Pill';
import { TICKET_STATUS, PRIORITY, SLA_HOURS_BY_PRIORITY as CONFIG_SLA_HOURS_BY_PRIORITY } from '../../services/config';

/**
 * The status vocabulary, in one place.
 *
 * Types are derived from services/config.ts's TICKET_STATUS / PRIORITY const
 * objects rather than declared here, so the SharePoint Choice value casing
 * ("In Progress", not "In progress") has exactly one source of truth.
 */
export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export type TicketPriority = (typeof PRIORITY)[keyof typeof PRIORITY];

/**
 * Where a ticket sits against its SLA. Computed in utils/slaHelpers.ts.
 * `unknown` is a ticket with no SLADueDateTime set at all — rare, but distinct
 * from `onTrack` so it never reads as a false all-clear.
 */
export type SlaState = 'onTrack' | 'dueSoon' | 'breached' | 'closed' | 'unknown';

/**
 * Colour per status. Only three statuses earn a colour: work in progress
 * (action), the ball being in the employee's court (warn), and a rejected fix
 * (danger). Everything else stays neutral or, once out of play, muted — which
 * is what lets a red pill actually mean something on a full queue.
 */
export const STATUS_TONE: Record<TicketStatus, PillTone> = {
  New: 'neutral',
  Assigned: 'neutral',
  'In Progress': 'action',
  'Pending Employee Confirmation': 'warn',
  Resolved: 'success',
  Reopened: 'danger',
  Closed: 'muted',
  Cancelled: 'muted'
};

/**
 * Shorter labels for table cells. "Pending Employee Confirmation" is 29
 * characters and breaks a 176px column; the full value still goes in the
 * `title` attribute, so nothing is hidden from a reader who hovers.
 */
export const STATUS_SHORT_LABEL: Record<TicketStatus, string> = {
  New: 'New',
  Assigned: 'Assigned',
  'In Progress': 'In Progress',
  'Pending Employee Confirmation': 'Pending confirmation',
  Resolved: 'Resolved',
  Reopened: 'Reopened',
  Closed: 'Closed',
  Cancelled: 'Cancelled'
};

/**
 * The same eight statuses said in the employee's language. Staff see the
 * system's word; the person who raised the ticket sees what it means for them.
 */
export const STATUS_EMPLOYEE_LABEL: Record<TicketStatus, string> = {
  New: 'With the desk',
  Assigned: 'With the desk',
  'In Progress': 'Being worked on',
  'Pending Employee Confirmation': 'Waiting for your answer',
  Resolved: 'Fix sent to you',
  Reopened: 'Reopened',
  Closed: 'Closed — you confirmed',
  Cancelled: 'Cancelled'
};

export const PRIORITY_TONE: Record<TicketPriority, PillTone> = {
  Critical: 'danger',
  High: 'warn',
  Medium: 'info',
  Low: 'muted'
};

/**
 * The SLA table from the build manual: one set of targets for every
 * department. Displayed next to a priority so the choice is informed rather
 * than guessed. Nothing enforces these — they drive display only. Re-exported
 * from config.ts rather than redeclared, so the hours live in one place.
 */
export const SLA_HOURS_BY_PRIORITY = CONFIG_SLA_HOURS_BY_PRIORITY;

export const SLA_TONE: Record<SlaState, PillTone> = {
  onTrack: 'success',
  dueSoon: 'warn',
  breached: 'danger',
  closed: 'muted',
  unknown: 'neutral'
};
