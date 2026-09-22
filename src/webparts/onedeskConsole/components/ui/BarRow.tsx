import * as React from 'react';
import styles from './BarRow.module.scss';
import { cx } from '../../utils/cx';

export interface IBarRowProps {
  /** Rendered as-is in the label column — plain text, or a pill like PriorityPill. */
  label: React.ReactNode;
  value: number;
  /** The largest value across the panel's rows — what a 100%-wide bar means here. */
  max: number;
  /** Red bar and value, for a bucket that needs a second look (e.g. "Over 7 days"). */
  tone?: 'default' | 'danger';
  /** Label column width in px. Callers size it to their panel's longest label. */
  labelWidth: number;
}

/** One labelled bar in a breakdown panel — Dashboard's "by priority" and "how long open" rows. */
export const BarRow: React.FunctionComponent<IBarRowProps> = ({ label, value, max, tone = 'default', labelWidth }) => {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={styles.row} style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr) 24px` }}>
      <span className={styles.label}>{label}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={cx(styles.fill, tone === 'danger' && styles.fillDanger)} style={{ width: `${percent}%` }} />
      </span>
      <span className={cx(styles.value, tone === 'danger' && styles.valueDanger)}>{value}</span>
    </div>
  );
};
