import * as React from 'react';
import styles from './MultiSelect.module.scss';
import { cx } from '../../utils/cx';
import { Icon } from './Icon';

export interface IMultiSelectOption {
  value: string;
  label: string;
}

export interface IMultiSelectProps {
  label: string;
  /** Hides the label visually but keeps it for screen readers. */
  labelHidden?: boolean;
  options: IMultiSelectOption[];
  /** Empty means "everything" - matches the service layer's undefined/[] filter semantics. */
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Shown on the trigger when nothing is checked, e.g. "All departments". */
  allLabel: string;
  className?: string;
}

let sequence = 0;

/**
 * A checkbox-list popover for filters that need more than one value at once
 * (department scope, ticket status) - the native <select> in Field.tsx can
 * only ever hold one. Built from real checkboxes and labels, not a fake
 * div-based control.
 */
export const MultiSelect: React.FunctionComponent<IMultiSelectProps> = ({
  label,
  labelHidden = false,
  options,
  selected,
  onChange,
  allLabel,
  className
}) => {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const idRef = React.useRef<string>('');
  if (!idRef.current) {
    sequence += 1;
    idRef.current = `odc-multiselect-${sequence}`;
  }

  React.useEffect(() => {
    if (!open) return undefined;

    const onDocPointerDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggleValue = (value: string): void => {
    onChange(selected.indexOf(value) === -1 ? [...selected, value] : selected.filter((v) => v !== value));
  };

  const summary =
    selected.length === 0
      ? allLabel
      : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} selected`;

  const labelId = `${idRef.current}-label`;
  const summaryId = `${idRef.current}-summary`;

  return (
    <div className={cx(styles.wrap, className)} ref={rootRef}>
      <span id={labelId} className={cx(styles.label, labelHidden && styles.visuallyHidden)}>
        {label}
      </span>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${summaryId}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span id={summaryId} className={styles.summary}>
          {summary}
        </span>
        <Icon name="chevronDown" size={15} strokeWidth={2} className={styles.chevron} />
      </button>

      {open && (
        <div className={styles.popover}>
          <div className={styles.popoverHeader}>
            <span className={styles.popoverTitle}>{label}</span>
            <button type="button" className={styles.clearButton} disabled={selected.length === 0} onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          <fieldset className={styles.optionList}>
            <legend className={styles.visuallyHidden}>{label}</legend>
            {options.map((option) => (
              <label key={option.value} className={styles.optionRow}>
                <input
                  type="checkbox"
                  checked={selected.indexOf(option.value) !== -1}
                  onChange={() => toggleValue(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
};
