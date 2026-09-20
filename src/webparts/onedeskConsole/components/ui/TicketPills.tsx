import * as React from 'react';
import { Pill } from './Pill';
import {
  PRIORITY_TONE,
  SLA_HOURS_BY_PRIORITY,
  SLA_TONE,
  STATUS_EMPLOYEE_LABEL,
  STATUS_SHORT_LABEL,
  STATUS_TONE,
  SlaState,
  TicketPriority,
  TicketStatus
} from './statusTone';

export interface IStatusPillProps {
  status: TicketStatus;
  /**
   * `employee` swaps the system's word for what it means to the person who
   * raised the ticket — "Waiting for your answer" rather than "Pending
   * Employee Confirmation". Use it on My tickets and Shared with me.
   */
  audience?: 'staff' | 'employee';
  size?: 'sm' | 'md';
}

export const StatusPill: React.FunctionComponent<IStatusPillProps> = ({
  status,
  audience = 'staff',
  size = 'sm'
}) => (
  <Pill tone={STATUS_TONE[status]} size={size}>
    <span title={status}>
      {audience === 'employee'
        ? STATUS_EMPLOYEE_LABEL[status]
        : STATUS_SHORT_LABEL[status]}
    </span>
  </Pill>
);

export interface IPriorityPillProps {
  priority: TicketPriority;
  /** Appends the SLA target, e.g. "Critical · 4h". Off inside dense tables. */
  withTarget?: boolean;
  size?: 'sm' | 'md';
}

export const PriorityPill: React.FunctionComponent<IPriorityPillProps> = ({
  priority,
  withTarget = false,
  size = 'sm'
}) => (
  <Pill tone={PRIORITY_TONE[priority]} shape="chip" size={size} outlined={false}>
    {withTarget
      ? `${priority} · ${SLA_HOURS_BY_PRIORITY[priority]}h`
      : priority}
  </Pill>
);

export interface ISlaPillProps {
  /**
   * Comes from utils/slaHelpers.ts — the same function the dashboard's
   * breach count uses, so a tile and a row can never disagree.
   */
  state: SlaState;
  /** Already-formatted, e.g. "Over by 6h", "Due in 2h", "Closed". */
  label: string;
  size?: 'sm' | 'md';
}

export const SlaPill: React.FunctionComponent<ISlaPillProps> = ({
  state,
  label,
  size = 'sm'
}) => (
  <Pill tone={SLA_TONE[state]} dot size={size} outlined={false}>
    {label}
  </Pill>
);
