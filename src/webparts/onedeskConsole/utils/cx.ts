/**
 * Joins class names, dropping anything falsy.
 *
 * A three-line local helper rather than a `clsx` dependency: the SPFx bundle is
 * served from the tenant App Catalog on every page load, and this is the whole
 * of what `clsx` would give us here.
 *
 * @example
 *   cx(styles.button, isActive && styles.isActive, className)
 */
export function cx(
  ...parts: Array<string | false | undefined>
): string {
  return parts.filter(Boolean).join(' ');
}
