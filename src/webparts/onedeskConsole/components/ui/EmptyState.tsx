import * as React from 'react';
import styles from './EmptyState.module.scss';
import { cx } from '../../utils/cx';
import { Icon, IconName } from './Icon';

export interface IEmptyStateProps {
  /** What is empty, said plainly: "No Critical tickets on the IT desk". */
  title: string;
  /**
   * Why it is empty and what to do. Name the filter that emptied it — an empty
   * state that does not explain itself reads as a broken screen.
   */
  description?: string;
  icon?: IconName;
  /** One action, usually "clear the filter". */
  action?: React.ReactNode;
  /** `inline` sits inside a table body; `panel` fills a card. */
  variant?: 'inline' | 'panel';
  className?: string;
}

export const EmptyState: React.FunctionComponent<IEmptyStateProps> = ({
  title,
  description,
  icon = 'inbox',
  action,
  variant = 'inline',
  className
}) => (
  <div className={cx(styles.empty, styles[variant], className)}>
    <Icon name={icon} size={variant === 'panel' ? 30 : 26} strokeWidth={1.5} className={styles.icon} />
    <span className={styles.title}>{title}</span>
    {description && <span className={styles.description}>{description}</span>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);
