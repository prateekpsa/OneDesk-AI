import * as React from 'react';
import styles from './Checkbox.module.scss';
import { cx } from '../../utils/cx';

let checkboxSequence = 0;

function useFieldId(provided?: string): string {
  const ref = React.useRef<string>(provided ?? '');
  if (!ref.current) {
    checkboxSequence += 1;
    ref.current = `odc-checkbox-${checkboxSequence}`;
  }
  return ref.current;
}

export interface ICheckboxProps {
  id?: string;
  label: string;
  /** Guidance shown under the label, inside the same bordered row. */
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

/**
 * A labelled checkbox in its own bordered row — the console's one "yes/no
 * with context" control, for a choice that needs a sentence of explanation
 * rather than a bare box (e.g. "would this help someone else?").
 */
export const Checkbox: React.FunctionComponent<ICheckboxProps> = ({ id, label, hint, checked, onChange, className }) => {
  const checkboxId = useFieldId(id);
  return (
    <label htmlFor={checkboxId} className={cx(styles.row, className)}>
      <input
        id={checkboxId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.input}
      />
      <span className={styles.textBlock}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
    </label>
  );
};
