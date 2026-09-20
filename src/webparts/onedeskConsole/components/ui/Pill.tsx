import * as React from 'react';
import styles from './Pill.module.scss';
import { cx } from '../../utils/cx';

export type PillTone =
  | 'neutral'
  | 'action'
  | 'info'
  | 'success'
  | 'warn'
  | 'danger'
  | 'muted';

/** `pill` is fully rounded (status, SLA); `chip` is softly rounded (priority). */
export type PillShape = 'pill' | 'chip';

export interface IPillProps {
  tone?: PillTone;
  shape?: PillShape;
  /** Adds the leading dot used on SLA pills, where colour carries the meaning. */
  dot?: boolean;
  /** `md` (26px) for a ticket header; `sm` (22px) inside table rows. */
  size?: 'sm' | 'md';
  /** Draw the tone's border. Off for the solid chips inside dense tables. */
  outlined?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * The console's one status vocabulary.
 *
 * Tone is never chosen at the call site by eye — it comes from the maps in
 * statusTone.ts, so "Reopened" is the same colour in the queue, on the ticket
 * and in an employee's own list.
 */
const SHAPE_CLASS: Record<PillShape, string> = {
  pill: styles.shapePill,
  chip: styles.shapeChip
};

export const Pill: React.FunctionComponent<IPillProps> = ({
  tone = 'neutral',
  shape = 'pill',
  dot = false,
  size = 'sm',
  outlined = true,
  className,
  children
}) => (
  <span
    className={cx(
      styles.pill,
      styles[tone],
      SHAPE_CLASS[shape],
      styles[size],
      outlined && styles.outlined,
      className
    )}
  >
    {dot && <span className={styles.dot} aria-hidden="true" />}
    {children}
  </span>
);
