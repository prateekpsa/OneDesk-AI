import * as React from 'react';
import styles from './ConsoleShell.module.scss';
import { cx } from '../../utils/cx';

export interface IConsoleShellProps {
  children: React.ReactNode;
  /**
   * True when the web part owns the viewport — a Single Part App Page, which is
   * how the console is hosted per Phase 7 of the build plan. In an ordinary web
   * part zone leave it false so the shell sizes to its content and the
   * SharePoint page scrolls normally.
   */
  fullHeight?: boolean;
  className?: string;
}

/**
 * Wraps the whole console and is the only element that declares design tokens.
 *
 * Everything beneath it inherits the palette, type, focus ring and scrollbar,
 * and nothing above it is affected — so the surrounding SharePoint page keeps
 * its own styling and the web part keeps its own regardless of where it lands.
 *
 * Wrap the existing root render in this; do not move any logic into it.
 */
export const ConsoleShell: React.FunctionComponent<IConsoleShellProps> = ({
  children,
  fullHeight = false,
  className
}) => (
  <div className={cx(styles.shell, fullHeight && styles.fullHeight, className)}>
    {children}
  </div>
);
