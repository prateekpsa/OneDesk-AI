/**
 * The signed-in person's resolved role (Phase 5, build_plan.md), derived once
 * from their StaffDirectory.UserScope value and reused everywhere the console
 * needs to know what to show/allow.
 */
export interface IUserRole {
  kind: 'employee' | 'staff' | 'admin';
  email: string;
  displayName: string;
  /** The department, only set when kind === 'staff'. */
  team?: string;
}
