import * as React from 'react';
import styles from './PageHeader.module.scss';
import { cx } from '../../utils/cx';

export interface IPageHeaderProps {
  title: string;
  /** One line saying what the screen is scoped to. Not a tagline. */
  subtitle?: string;
  /** Buttons, segmented controls, a "refreshed 14 seconds ago" note. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The same header on every tab: one h1, one line of scope, actions on the
 * right. Screens differ below this line, never at it.
 */
export const PageHeader: React.FunctionComponent<IPageHeaderProps> = ({
  title,
  subtitle,
  actions,
  className
}) => (
  <div className={cx(styles.header, className)}>
    <div className={styles.titleBlock}>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>
);

export interface ISectionHeadingProps {
  children: React.ReactNode;
  /** Right-aligned note or link. */
  aside?: React.ReactNode;
  className?: string;
}

/** The card-level heading — the h2 that sits inside a panel. */
export const SectionHeading: React.FunctionComponent<ISectionHeadingProps> = ({
  children,
  aside,
  className
}) => (
  <div className={cx(styles.section, className)}>
    <h2 className={styles.sectionTitle}>{children}</h2>
    {aside && <div className={styles.sectionAside}>{aside}</div>}
  </div>
);
