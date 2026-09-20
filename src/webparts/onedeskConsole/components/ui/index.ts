/**
 * The OneDesk UI kit.
 *
 * Screens import from here and nowhere else:
 *   import { Button, DataTable, StatusPill } from '../ui';
 *
 * If a screen needs a literal colour, a raw <input>, or its own table, the kit
 * is missing something — add it here rather than in the screen, or the tabs
 * start drifting apart again.
 */

export { ConsoleShell } from './ConsoleShell';
export type { IConsoleShellProps } from './ConsoleShell';

export { Topbar } from './Topbar';
export type { ITopbarProps } from './Topbar';

export { SideNav } from './SideNav';
export type { ISideNavProps, ISideNavGroup, ISideNavItem, ISideNavScopeCard } from './SideNav';

export { Icon } from './Icon';
export type { IconName, IIconProps } from './Icon';

export { Button, IconButton } from './Button';
export type {
  ButtonVariant,
  ButtonSize,
  IButtonProps,
  IIconButtonProps
} from './Button';

export { Pill } from './Pill';
export type { PillTone, PillShape, IPillProps } from './Pill';

export { Chip } from './Chip';
export type { IChipProps } from './Chip';

export { Checkbox } from './Checkbox';
export type { ICheckboxProps } from './Checkbox';

export { StatusPill, PriorityPill, SlaPill } from './TicketPills';
export type {
  IStatusPillProps,
  IPriorityPillProps,
  ISlaPillProps
} from './TicketPills';

export {
  STATUS_TONE,
  STATUS_SHORT_LABEL,
  STATUS_EMPLOYEE_LABEL,
  PRIORITY_TONE,
  SLA_TONE,
  SLA_HOURS_BY_PRIORITY
} from './statusTone';
export type { TicketStatus, TicketPriority, SlaState } from './statusTone';

export { Field, TextInput, TextArea, Select, SearchInput } from './Field';
export type {
  IFieldShellProps,
  ITextInputProps,
  ITextAreaProps,
  ISelectProps,
  ISelectOption,
  ISearchInputProps
} from './Field';

export { DataTable, MonoCell, TruncatedCell } from './DataTable';
export type { IDataTableProps, IDataTableColumn } from './DataTable';

export { PageHeader, SectionHeading } from './PageHeader';
export type { IPageHeaderProps, ISectionHeadingProps } from './PageHeader';

export { EmptyState } from './EmptyState';
export type { IEmptyStateProps } from './EmptyState';

export { StatusBanner } from './StatusBanner';
export type { BannerTone, IStatusBannerProps } from './StatusBanner';
