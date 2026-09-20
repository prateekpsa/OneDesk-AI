import * as React from 'react';
import styles from './DataTable.module.scss';
import { cx } from '../../utils/cx';

export interface IDataTableColumn<T> {
  /** Stable key; also used as the React key for the cell. */
  key: string;
  header: string;
  /**
   * A CSS width for <col>, e.g. '152px' or 'auto'. The table is
   * `table-layout: fixed`, so 'auto' columns share whatever is left.
   */
  width: string;
  render: (row: T) => React.ReactNode;
  /**
   * Exactly one column should set this — normally the ticket number. It is
   * rendered as <th scope="row">, which is what lets a screen reader say
   * "PSDESK-IT-000011, Status, In Progress" instead of reading bare cells, and
   * it holds the button when the row is selectable.
   */
  isRowHeader?: boolean;
  align?: 'start' | 'end';
  /** Set true to drop the column — e.g. Department outside the admin scope. */
  hidden?: boolean;
}

export interface IDataTableProps<T> {
  /** Announced to screen readers; never shown. e.g. "IT queue, 12 tickets". */
  caption: string;
  columns: Array<IDataTableColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  /** Makes rows activatable. The row header cell becomes the button. */
  onRowSelect?: (row: T) => void;
  /** rowKey of the currently open row, for master/detail panes. */
  selectedKey?: string;
  loading?: boolean;
  loadingRowCount?: number;
  /** Shown in place of rows when `rows` is empty and not loading. */
  empty?: React.ReactNode;
  /** Sticky bar under the table — counts, pagination, a caveat. */
  footer?: React.ReactNode;
  density?: 'compact' | 'comfortable';
  className?: string;
}

/**
 * The console's one table.
 *
 * A real <table> rather than a CSS grid: the header association, row-header
 * semantics and "row 4 of 12" announcements come for free, and the sticky
 * header still works with `position: sticky` on the cells. Grid layout looks
 * identical and is silent to a screen reader.
 *
 * Row activation lives on a button inside the row header cell. The <tr> also
 * carries onClick as a convenience for mouse users; keyboard users reach the
 * same action by tabbing to the button, so nothing is keyboard-inaccessible.
 */
export function DataTable<T>(props: IDataTableProps<T>): React.ReactElement {
  const {
    caption,
    columns,
    rows,
    rowKey,
    onRowSelect,
    selectedKey,
    loading = false,
    loadingRowCount = 6,
    empty,
    footer,
    density = 'compact',
    className
  } = props;

  const visible = columns.filter((column) => !column.hidden);

  const renderCellContent = (
    column: IDataTableColumn<T>,
    row: T
  ): React.ReactNode => {
    const content = column.render(row);
    if (column.isRowHeader && onRowSelect) {
      return (
        <button
          type="button"
          className={styles.rowButton}
          onClick={(event) => {
            // The <tr> handler would otherwise fire for the same click.
            event.stopPropagation();
            onRowSelect(row);
          }}
        >
          {content}
        </button>
      );
    }
    return content;
  };

  return (
    <div className={cx(styles.frame, className)}>
      <div className={styles.scroll}>
        <table className={cx(styles.table, styles[density])}>
          <caption className={styles.caption}>{caption}</caption>
          <colgroup>
            {visible.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {visible.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cx(
                    styles.headCell,
                    column.align === 'end' && styles.alignEnd
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: loadingRowCount }).map((_unused, index) => (
                <tr key={`skeleton-${index}`} className={styles.row}>
                  {visible.map((column) => (
                    <td key={column.key} className={styles.cell}>
                      <span className={styles.skeleton} />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && rows.length === 0 && empty && (
              <tr>
                <td className={styles.emptyCell} colSpan={visible.length}>
                  {empty}
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr
                    key={key}
                    className={cx(
                      styles.row,
                      onRowSelect && styles.selectable,
                      selectedKey === key && styles.selected
                    )}
                    onClick={onRowSelect ? () => onRowSelect(row) : undefined}
                  >
                    {visible.map((column) =>
                      column.isRowHeader ? (
                        <th
                          key={column.key}
                          scope="row"
                          className={cx(
                            styles.cell,
                            styles.rowHeaderCell,
                            column.align === 'end' && styles.alignEnd
                          )}
                        >
                          {renderCellContent(column, row)}
                        </th>
                      ) : (
                        <td
                          key={column.key}
                          className={cx(
                            styles.cell,
                            column.align === 'end' && styles.alignEnd
                          )}
                        >
                          {column.render(row)}
                        </td>
                      )
                    )}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}

/** Ticket numbers, and nothing else, are set in the mono face. */
export const MonoCell: React.FunctionComponent<{ children: React.ReactNode }> = ({
  children
}) => <span className={styles.mono}>{children}</span>;

/** A cell whose text should ellipsis rather than wrap — subjects, mostly. */
export const TruncatedCell: React.FunctionComponent<{
  title?: string;
  muted?: boolean;
  children: React.ReactNode;
}> = ({ title, muted, children }) => (
  <span className={cx(styles.truncate, muted && styles.mutedText)} title={title}>
    {children}
  </span>
);
