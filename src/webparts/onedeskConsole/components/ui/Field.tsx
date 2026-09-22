import * as React from 'react';
import styles from './Field.module.scss';
import { cx } from '../../utils/cx';
import { Icon } from './Icon';

let fieldSequence = 0;

/**
 * A stable id for the lifetime of the control, so the <label> keeps pointing at
 * the right input across re-renders. React 17 has no useId; this is the
 * equivalent that does not change on every render the way Math.random would.
 */
function useFieldId(provided?: string): string {
  const ref = React.useRef<string>(provided ?? '');
  if (!ref.current) {
    fieldSequence += 1;
    ref.current = `odc-field-${fieldSequence}`;
  }
  return ref.current;
}

export interface IFieldShellProps {
  id: string;
  label: string;
  /** Hides the label visually but keeps it for screen readers. */
  labelHidden?: boolean;
  /** Renders the "Required" marker and sets aria-required on the control. */
  required?: boolean;
  /** Guidance shown under the control. Hidden while an error is showing. */
  hint?: string;
  /** A validation message. Its presence is what puts the control in error. */
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FunctionComponent<IFieldShellProps> = ({
  id,
  label,
  labelHidden = false,
  required = false,
  hint,
  error,
  className,
  children
}) => (
  <div className={cx(styles.field, className)}>
    <label
      htmlFor={id}
      className={cx(styles.label, labelHidden && styles.visuallyHidden)}
    >
      {label}
      {required && <span className={styles.required}> (Required)</span>}
    </label>
    {children}
    {error ? (
      <span id={`${id}-error`} className={styles.error} role="alert">
        {error}
      </span>
    ) : (
      hint && (
        <span id={`${id}-hint`} className={styles.hint}>
          {hint}
        </span>
      )
    )}
  </div>
);

/** The label/hint/error props every control in the kit shares. */
interface IFieldProps {
  label: string;
  labelHidden?: boolean;
  hint?: string;
  error?: string;
  fieldClassName?: string;
}

function describedBy(
  id: string,
  hint?: string,
  error?: string
): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

// --- text input -------------------------------------------------------------

export interface ITextInputProps
  extends IFieldProps,
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'> {
  className?: string;
}

export const TextInput: React.FunctionComponent<ITextInputProps> = ({
  label,
  labelHidden,
  hint,
  error,
  fieldClassName,
  className,
  id,
  required,
  ...rest
}) => {
  const fieldId = useFieldId(id);
  return (
    <Field
      id={fieldId}
      label={label}
      labelHidden={labelHidden}
      required={required}
      hint={hint}
      error={error}
      className={fieldClassName}
    >
      <input
        {...rest}
        id={fieldId}
        type={rest.type ?? 'text'}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={cx(styles.control, error && styles.hasError, className)}
      />
    </Field>
  );
};

// --- textarea ---------------------------------------------------------------

export interface ITextAreaProps
  extends IFieldProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  className?: string;
  /** Shown bottom-right under the control, e.g. "182 characters". */
  counter?: string;
}

export const TextArea: React.FunctionComponent<ITextAreaProps> = ({
  label,
  labelHidden,
  hint,
  error,
  fieldClassName,
  className,
  counter,
  id,
  required,
  rows = 4,
  ...rest
}) => {
  const fieldId = useFieldId(id);
  return (
    <Field
      id={fieldId}
      label={label}
      labelHidden={labelHidden}
      required={required}
      hint={counter ? undefined : hint}
      error={error}
      className={fieldClassName}
    >
      <textarea
        {...rest}
        id={fieldId}
        rows={rows}
        required={required}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className={cx(styles.control, styles.textarea, error && styles.hasError, className)}
      />
      {counter && !error && (
        <span className={styles.counterRow}>
          {hint && (
            <span id={`${fieldId}-hint`} className={styles.hint}>
              {hint}
            </span>
          )}
          <span className={styles.counter}>{counter}</span>
        </span>
      )}
    </Field>
  );
};

// --- select -----------------------------------------------------------------

export interface ISelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ISelectProps
  extends IFieldProps,
    Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'children'> {
  className?: string;
  options: ISelectOption[];
  /** A leading non-value option, e.g. "All statuses" or "Choose a department". */
  placeholderOption?: string;
}

/**
 * A native <select> with the chevron drawn beside it rather than a custom
 * listbox: it gets keyboard behaviour, type-ahead and mobile pickers for free,
 * and it is the same control on every tab.
 */
export const Select: React.FunctionComponent<ISelectProps> = ({
  label,
  labelHidden,
  hint,
  error,
  fieldClassName,
  className,
  options,
  placeholderOption,
  id,
  required,
  ...rest
}) => {
  const fieldId = useFieldId(id);
  return (
    <Field
      id={fieldId}
      label={label}
      labelHidden={labelHidden}
      required={required}
      hint={hint}
      error={error}
      className={fieldClassName}
    >
      <span className={styles.selectWrap}>
        <select
          {...rest}
          id={fieldId}
          required={required}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cx(styles.control, styles.select, error && styles.hasError, className)}
        >
          {placeholderOption && <option value="">{placeholderOption}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="chevronDown" size={15} strokeWidth={2} className={styles.selectChevron} />
      </span>
    </Field>
  );
};

// --- search -----------------------------------------------------------------

export interface ISearchInputProps
  extends Omit<ITextInputProps, 'labelHidden' | 'type'> {}

/**
 * A text input with the magnifier inside it. The label defaults to hidden —
 * the icon says what it is — but it is still announced.
 */
export const SearchInput: React.FunctionComponent<ISearchInputProps> = ({
  label,
  hint,
  error,
  fieldClassName,
  className,
  id,
  ...rest
}) => {
  const fieldId = useFieldId(id);
  return (
    <Field
      id={fieldId}
      label={label}
      labelHidden
      hint={hint}
      error={error}
      className={fieldClassName}
    >
      <span className={styles.searchWrap}>
        <Icon name="search" size={15} strokeWidth={2} className={styles.searchIcon} />
        <input
          {...rest}
          id={fieldId}
          type="search"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cx(styles.control, styles.search, error && styles.hasError, className)}
        />
      </span>
    </Field>
  );
};
