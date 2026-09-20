import * as React from 'react';
import styles from './Topbar.module.scss';
import { cx } from '../../utils/cx';

// SPFx's webpack config resolves image imports to their bundled URL; `require`
// (not `import`) is used because no *.png module declaration exists in this
// project, matching how the generated *.module.scss.ts files already `require`
// their compiled CSS.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoUrl: string = require('../../assets/ps-logo.png');

export interface ITopbarProps {
  /** The admin-only department scope picker, rendered beside the wordmark. */
  scopePicker?: React.ReactNode;
  liveLabel: string;
  liveTone?: 'live' | 'sample';
  userName: string;
  userRoleLine: string;
  userInitials: string;
  className?: string;
}

/**
 * The console's one topbar: logo, wordmark, the admin scope picker when
 * there is one, a live/sample data indicator, and the signed-in identity.
 * Purely presentational - OnedeskConsole.tsx supplies every value.
 */
export const Topbar: React.FunctionComponent<ITopbarProps> = ({
  scopePicker,
  liveLabel,
  liveTone = 'live',
  userName,
  userRoleLine,
  userInitials,
  className
}) => (
  <header className={cx(styles.topbar, className)}>
    <img src={logoUrl} alt="Preferred Square" className={styles.logo} />
    <div className={styles.divider} />
    <div className={styles.wordmarkBlock}>
      <span className={styles.wordmark}>OneDesk</span>
      <span className={styles.tagline}>Employee support console</span>
    </div>
    {scopePicker && (
      <>
        <div className={styles.divider} />
        {scopePicker}
      </>
    )}
    <div className={styles.spacer} />
    <span className={cx(styles.livePill, liveTone === 'sample' && styles.livePillSample)}>
      <span className={styles.liveDot} aria-hidden="true" />
      {liveLabel}
    </span>
    <div className={styles.userBlock}>
      <span className={styles.avatar}>{userInitials}</span>
      <div className={styles.userText}>
        <span className={styles.userName}>{userName}</span>
        <span className={styles.userRole}>{userRoleLine}</span>
      </div>
    </div>
  </header>
);
