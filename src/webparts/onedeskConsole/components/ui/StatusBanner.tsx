import * as React from 'react';
import styles from './StatusBanner.module.scss';
import { cx } from '../../utils/cx';
import { Icon, IconName } from './Icon';

export type BannerTone = 'info' | 'success' | 'warn' | 'danger' | 'muted';

const DEFAULT_ICON: Record<BannerTone, IconName> = {
  info: 'info',
  success: 'check',
  warn: 'alert',
  danger: 'alert',
  muted: 'lock'
};

export interface IStatusBannerProps {
  tone?: BannerTone;
  /** Optional bold first line. Omit for a single-sentence banner. */
  title?: string;
  children: React.ReactNode;
  icon?: IconName;
  /** A retry button, usually. One action at most. */
  action?: React.ReactNode;
  /**
   * Filled rather than tinted — the success confirmation after a write lands.
   * Only `success` is ever filled; a filled warning shouts.
   */
  filled?: boolean;
  /**
   * Announce it the moment it appears. Defaults to true for warn and danger,
   * which is what the write flows' refusal messages need:
   * "This ticket is closed. Reopen it before making changes."
   */
  live?: boolean;
  className?: string;
}

/**
 * Every message the console shows a person, in one component: the inline
 * guidance on a form, the refusal a Power Automate flow returns, the
 * "SharePoint did not answer" warning, and the confirmation after a write.
 *
 * Show the server's returned message verbatim — never a raw error object, and
 * never a generic "Something went wrong" when the flow told you exactly what
 * was wrong.
 */
export const StatusBanner: React.FunctionComponent<IStatusBannerProps> = ({
  tone = 'info',
  title,
  children,
  icon,
  action,
  filled = false,
  live,
  className
}) => {
  const isLive = live ?? (tone === 'warn' || tone === 'danger');
  return (
    <div
      className={cx(styles.banner, styles[tone], filled && styles.filled, className)}
      role={isLive ? 'alert' : undefined}
    >
      <Icon
        name={icon ?? DEFAULT_ICON[tone]}
        size={16}
        strokeWidth={tone === 'success' ? 2.4 : 2}
        className={styles.icon}
      />
      <div className={styles.body}>
        {title && <span className={styles.title}>{title}</span>}
        <span className={styles.text}>{children}</span>
        {action && <div className={styles.action}>{action}</div>}
      </div>
    </div>
  );
};
