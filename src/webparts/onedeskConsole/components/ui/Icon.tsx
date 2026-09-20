import * as React from 'react';

/**
 * The console's icon set.
 *
 * Inline SVG rather than an icon font or a Fluent import: these are the only
 * fifteen glyphs the design uses, they inherit `currentColor` so a pill or a
 * button tints them for free, and nothing has to load before they paint.
 *
 * Every glyph is drawn on a 24x24 grid with a 1.8 stroke so they sit together
 * at any size. Add a new one here rather than pasting SVG into a component.
 */
export type IconName =
  | 'dashboard'
  | 'queue'
  | 'knowledge'
  | 'plusCircle'
  | 'ticket'
  | 'people'
  | 'userSearch'
  | 'search'
  | 'chevronDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'refresh'
  | 'bell'
  | 'lock'
  | 'check'
  | 'close'
  | 'alert'
  | 'info'
  | 'clock'
  | 'inbox';

export interface IIconProps {
  name: IconName;
  /** Edge length in px. Defaults to 17, the size used throughout the console. */
  size?: number;
  /** Stroke weight. Defaults to 1.8; bump to ~2.4 for small confirmation ticks. */
  strokeWidth?: number;
  className?: string;
  /**
   * Leave undefined for a decorative icon (the default): it is hidden from
   * assistive technology, which is correct when adjacent text already says what
   * it means. Pass a title only when the icon is the sole carrier of meaning.
   */
  title?: string;
}

const GLYPHS: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  queue: (
    <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3.6" cy="6" r="1.3" fill="currentColor" />
      <circle cx="3.6" cy="12" r="1.3" fill="currentColor" />
      <circle cx="3.6" cy="18" r="1.3" fill="currentColor" />
    </>
  ),
  knowledge: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
    </>
  ),
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  ticket: (
    <path d="M3 9.5V7a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 7v2.5a2.5 2.5 0 0 0 0 5V17a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17v-2.5a2.5 2.5 0 0 0 0-5" />
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3.2 3.2 0 0 1 0 6" />
      <path d="M18 14.4a5.5 5.5 0 0 1 2.6 4.6" />
    </>
  ),
  userSearch: (
    <>
      <circle cx="11" cy="9" r="3.4" />
      <path d="M5 19a6 6 0 0 1 12 0" />
      <circle cx="18" cy="17.5" r="3" />
      <line x1="20.2" y1="19.7" x2="22.5" y2="22" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </>
  ),
  chevronDown: <polyline points="6 9 12 15 18 9" />,
  chevronLeft: <polyline points="15 5 8 12 15 19" />,
  chevronRight: <polyline points="9 5 16 12 9 19" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-1.6 5.4" />
      <polyline points="20 4 20 11 13 11" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2 7.5-2 7.5h16s-2-1.5-2-7.5" />
      <path d="M10.3 19.5a2 2 0 0 0 3.4 0" />
    </>
  ),
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" />
    </>
  ),
  check: <polyline points="4 12.5 9.5 18 20 6.5" />,
  close: (
    <>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5 22 20H2z" />
      <line x1="12" y1="9.5" x2="12" y2="14" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16.5" />
      <circle cx="12" cy="7.8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </>
  ),
  inbox: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <line x1="7" y1="10" x2="13" y2="10" />
      <line x1="7" y1="14" x2="10" y2="14" />
    </>
  )
};

export const Icon: React.FunctionComponent<IIconProps> = ({
  name,
  size = 17,
  strokeWidth = 1.8,
  className,
  title
}) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    focusable="false"
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
    aria-label={title}
  >
    {GLYPHS[name]}
  </svg>
);
