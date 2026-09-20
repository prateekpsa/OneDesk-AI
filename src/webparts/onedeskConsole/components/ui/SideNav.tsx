import * as React from 'react';
import styles from './SideNav.module.scss';
import { cx } from '../../utils/cx';
import { Icon, IconName } from './Icon';

export interface ISideNavItem {
  key: string;
  label: string;
  icon: IconName;
  /** Omit to show no badge; a badge of 0 is also hidden. */
  badge?: number;
  active: boolean;
  onClick: () => void;
}

export interface ISideNavGroup {
  label: string;
  items: ISideNavItem[];
}

export interface ISideNavScopeCard {
  label: string;
  value: string;
  note: string;
}

export interface ISideNavProps {
  groups: ISideNavGroup[];
  /** The "Your scope" card pinned to the bottom of the panel. */
  scopeCard?: ISideNavScopeCard;
  className?: string;
}

/**
 * The console's left navigation: grouped sections of tabs, each optionally
 * badged with a live count, plus the pinned scope card explaining what the
 * signed-in person can act on. Purely presentational.
 */
export const SideNav: React.FunctionComponent<ISideNavProps> = ({ groups, scopeCard, className }) => (
  <nav className={cx(styles.sideNav, className)} aria-label="Console sections">
    <div className={styles.groups}>
      {groups.map((group) => (
        <div key={group.label} className={styles.group}>
          <span className={styles.groupLabel}>{group.label}</span>
          {group.items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={cx(styles.item, item.active && styles.itemActive)}
              aria-current={item.active ? 'page' : undefined}
              onClick={item.onClick}
            >
              <Icon name={item.icon} size={17} strokeWidth={1.8} />
              <span className={styles.itemLabel}>{item.label}</span>
              {!!item.badge && <span className={styles.badge}>{item.badge}</span>}
            </button>
          ))}
        </div>
      ))}
    </div>

    {scopeCard && (
      <div className={styles.scopeCard}>
        <span className={styles.scopeLabel}>{scopeCard.label}</span>
        <span className={styles.scopeValue}>{scopeCard.value}</span>
        <span className={styles.scopeNote}>{scopeCard.note}</span>
      </div>
    )}
  </nav>
);
