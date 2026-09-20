import * as React from 'react';
import styles from './Button.module.scss';
import { cx } from '../../utils/cx';
import { Icon, IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface IButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * `primary` is the one action a screen region is for — never two side by
   * side. `danger` is reserved for writes that lose work; refusing or
   * cancelling is `secondary`.
   */
  variant?: ButtonVariant;
  /** `md` (40px) everywhere; `lg` (44px) for a form's submit; `sm` for toolbars. */
  size?: ButtonSize;
  iconBefore?: IconName;
  iconAfter?: IconName;
  /**
   * A write is in flight. Blocks re-entry (the duplicate-submit bug) and tells
   * assistive technology, while leaving the label readable.
   */
  busy?: boolean;
  fullWidth?: boolean;
}

/**
 * Note the explicit `type="button"` default: a button inside a <form> defaults
 * to `submit` in HTML, which silently posts the form. Pass `type="submit"`
 * deliberately on the one button that should.
 */
export const Button: React.FunctionComponent<IButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  iconBefore,
  iconAfter,
  busy = false,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}) => (
  <button
    {...rest}
    type={type}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={cx(
      styles.button,
      styles[variant],
      styles[size],
      fullWidth && styles.fullWidth,
      className
    )}
  >
    {iconBefore && <Icon name={iconBefore} size={15} strokeWidth={1.9} />}
    <span className={styles.label}>{children}</span>
    {iconAfter && <Icon name={iconAfter} size={15} strokeWidth={1.9} />}
  </button>
);

export interface IIconButtonProps
  extends Omit<IButtonProps, 'iconBefore' | 'iconAfter' | 'children'> {
  icon: IconName;
  /**
   * Required. An icon-only control has no text for a screen reader to
   * announce, so the type system refuses to let you ship one without a name.
   */
  label: string;
}

export const IconButton: React.FunctionComponent<IIconButtonProps> = ({
  icon,
  label,
  variant = 'secondary',
  size = 'md',
  busy = false,
  disabled,
  className,
  type = 'button',
  ...rest
}) => (
  <button
    {...rest}
    type={type}
    aria-label={label}
    title={label}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={cx(
      styles.button,
      styles[variant],
      styles[size],
      styles.iconOnly,
      className
    )}
  >
    <Icon name={icon} size={16} strokeWidth={1.9} />
  </button>
);
