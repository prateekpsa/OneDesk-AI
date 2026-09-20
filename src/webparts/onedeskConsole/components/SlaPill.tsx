import * as React from 'react';
import styles from './SlaPill.module.scss';
import type { ITicket } from '../models/ITicket';
import { getSlaState } from '../utils/slaHelpers';

const LABELS: Record<string, string> = {
  closed: 'Closed',
  breached: 'SLA breached',
  warning: 'Due soon',
  ontrack: 'On track',
  unknown: 'No SLA',
};

const SlaPill: React.FC<{ ticket: ITicket }> = ({ ticket }) => {
  const state = getSlaState(ticket);
  return <span className={`${styles.pill} ${styles[state]}`}>{LABELS[state]}</span>;
};

export default SlaPill;
