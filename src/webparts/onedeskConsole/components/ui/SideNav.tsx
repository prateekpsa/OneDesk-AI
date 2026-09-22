import * as React from 'react';
import styles from './SideNav.module.scss';
import { cx } from '../../utils/cx';
import { Icon, IconName } from './Icon';
import { IconButton } from './Button';

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
 *
 * Collapse is view-only UI state, not a business rule, so it lives here
 * rather than being threaded through from OnedeskConsole - nothing outside
 * the nav needs to know about it, the content column is already flex-grow.
 */
export const SideNav: React.FunctionComponent<ISideNavProps> = ({ groups, scopeCard, className }) => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <nav className={cx(styles.sideNav, collapsed && styles.collapsed, className)} aria-label="Console sections">
      <div className={styles.groups}>
        {groups.map((group, index) => (
          <div key={group.label} className={styles.group}>
            <div className={styles.groupHeader}>
              <span className={cx(styles.groupLabel, collapsed && styles.visuallyHidden)}>{group.label}</span>
              {index === 0 && (
                <IconButton
                  icon={collapsed ? 'chevronRight' : 'chevronLeft'}
                  label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                  aria-expanded={!collapsed}
                  variant="quiet"
                  size="sm"
                  onClick={() => setCollapsed((c) => !c)}
                />
              )}
            </div>
            {group.items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={cx(styles.item, item.active && styles.itemActive)}
                aria-current={item.active ? 'page' : undefined}
                onClick={item.onClick}
              >
                <Icon name={item.icon} size={17} strokeWidth={1.8} />
                <span className={cx(styles.itemLabel, collapsed && styles.visuallyHidden)}>{item.label}</span>
                {!!item.badge && (
                  <span className={cx(styles.badge, collapsed && styles.visuallyHidden)}>{item.badge}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {scopeCard && !collapsed && (
        <div className={styles.scopeCard}>
          <span className={styles.scopeLabel}>{scopeCard.label}</span>
          <span className={styles.scopeValue}>{scopeCard.value}</span>
          <span className={styles.scopeNote}>{scopeCard.note}</span>
        </div>
      )}
    </nav>
  );
};
