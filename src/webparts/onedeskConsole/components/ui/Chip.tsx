import * as React from 'react';
import styles from './Chip.module.scss';
import { cx } from '../../utils/cx';

export interface IChipProps {
  /** An aria-pressed toggle, not a link — picking one shows its detail elsewhere on the screen. */
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * A selectable pill button. Not for status or priority display — that's
 * `Pill`, which renders a `<span>` and is never clickable.
 */
export const Chip: React.FunctionComponent<IChipProps> = ({ selected = false, onClick, className, children }) => (
  <button
    type="button"
    aria-pressed={selected}
    className={cx(styles.chip, selected && styles.selected, className)}
    onClick={onClick}
  >
    {children}
  </button>
);
