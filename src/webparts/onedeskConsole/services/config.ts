// ============================================================================
// onedesk-console SharePoint config - single source of truth for list names,
// SLA hours, and Choice-field values. Unlike jarvis-repository's fieldMap.ts,
// OneDesk's lists get real PascalCase column names on creation, so there's no
// field_N dictionary needed here - just names and values.
// ============================================================================

export const SITE_URL = 'https://prefsquare.sharepoint.com/sites/OneDesk';

export const LISTS = {
  TICKETS: 'Tickets',
  CATEGORIES: 'Categories',
  COUNTERS: 'Counters',
  TICKET_PARTICIPANTS: 'TicketParticipants',
  KNOWLEDGE_ARTICLES: 'KnowledgeArticles',
  COMMITTEES: 'Committees',
  AUDIT_LOGS: 'AuditLogs',
  STAFF_DIRECTORY: 'StaffDirectory',
} as const;

export const KNOWLEDGE_DOCUMENTS_LIBRARY = 'KnowledgeDocuments';

/** Hours allowed before a ticket's SLADueDateTime, by Priority. */
export const SLA_HOURS_BY_PRIORITY: Record<string, number> = {
  Critical: 4,
  High: 8,
  Medium: 24,
  Low: 48,
};

// Choice-field values, kept as named constants so a typo (e.g. "In progress"
// vs "In Progress") is a compile error at the call site, not a silent filter
// mismatch discovered live against SharePoint - the value-level equivalent of
// what jarvis-repository's fieldMap.ts does for field *names*.

export const TICKET_STATUS = {
  NEW: 'New',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  PENDING_EMPLOYEE_CONFIRMATION: 'Pending Employee Confirmation',
  RESOLVED: 'Resolved',
  REOPENED: 'Reopened',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
} as const;

export const PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
} as const;

export const TEAM = {
  IT: 'IT',
  HR: 'HR',
  ADMIN: 'Admin',
  ANALYTICS: 'Analytics',
  FINANCE: 'Finance',
  OTHER: 'Other',
} as const;

export const ARTICLE_STATUS = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending Review',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
} as const;

export const PARTICIPANT_ROLE = {
  CONCERNED: 'Concerned',
  WATCHER: 'Watcher',
  APPROVER: 'Approver',
} as const;

// StaffDirectory's single role/department column (Phase 5). Deliberately
// separate from TEAM above: TEAM is every possible ticket-owning team
// (includes "Other", used for CurrentOwnerTeam/Department on Tickets);
// USER_SCOPE is who a *person* is, and only the five real departments plus
// the two non-department roles are valid here. SUPER_ADMIN is named that,
// not "Admin", because "Admin" is already a department (see USER_SCOPE.ADMIN)
// - one word can't mean both without being ambiguous.
export const USER_SCOPE = {
  IT: 'IT',
  HR: 'HR',
  ADMIN: 'Admin',
  ANALYTICS: 'Analytics',
  FINANCE: 'Finance',
  SUPER_ADMIN: 'Super Admin',
  USER: 'User',
} as const;

// The live StaffDirectory's UserScope column was created by renaming the old
// "Team" column and changing its choices, rather than adding a brand-new
// column. Renaming a column's display title in SharePoint never changes its
// internal (API) name, so the REST API still only knows this field as "Team"
// - confirmed via /_api/web/lists/getbytitle('StaffDirectory')/fields. Every
// other reference to "UserScope" in this codebase is just our own naming and
// is unaffected; only the raw SharePoint select/filter needs this.
export const USER_SCOPE_FIELD = 'Team';

/** Lowercase + trim for every email comparison - SharePoint's `eq` filter ignores case, our `===` doesn't. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type RoleKind = 'employee' | 'staff' | 'admin';

/**
 * Turns a StaffDirectory.UserScope value into a role kind (+ department when
 * staff). The one place this mapping is written, reused by both services'
 * write guards and the shell's useUserRole hook so they can never disagree.
 */
export function deriveRole(userScope: string | undefined): { kind: RoleKind; team?: string } {
  if (userScope === USER_SCOPE.SUPER_ADMIN) return { kind: 'admin' };
  if (!userScope || userScope === USER_SCOPE.USER) return { kind: 'employee' };
  return { kind: 'staff', team: userScope };
}

// Shared refusal message text, so both services say exactly the same thing
// instead of two copies of the same string drifting apart.
export const REFUSAL = {
  NOT_YOUR_DEPARTMENT: 'You can only act on tickets owned by your team.',
  OWN_DEPARTMENT_RAISE: "You can't raise a ticket to your own department — contact your team directly.",
  ARTICLE_NOT_CLOSED: "This article's ticket isn't closed yet.",
  TICKET_CLOSED: 'This ticket is closed. Reopen it before making changes.',
} as const;

/** Formats a ticket number as PSDESK-{DEPT}-{6-digit zero-padded sequence}. */
export function formatTicketNumber(department: string, sequence: number): string {
  let padded = String(sequence);
  while (padded.length < 6) padded = `0${padded}`;
  return `PSDESK-${department}-${padded}`;
}

export const ACTION_TYPE = {
  TICKET_CREATED: 'TicketCreated',
  STATUS_CHANGED: 'StatusChanged',
  REASSIGNED: 'Reassigned',
  CONCERNED_PERSON_ADDED: 'ConcernedPersonAdded',
  CLOSURE_CONFIRMED: 'ClosureConfirmed',
  REOPENED: 'Reopened',
  KNOWLEDGE_DRAFTED: 'KnowledgeDrafted',
  KNOWLEDGE_PUBLISHED: 'KnowledgePublished',
  DUPLICATE_REPORTED: 'DuplicateReported',
} as const;
