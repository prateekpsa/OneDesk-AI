import * as React from 'react';
import styles from './SharedWithMe.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import { normalizeEmail } from '../../services/config';
import { getSlaState, slaLabel } from '../../utils/slaHelpers';
import {
  PageHeader,
  DataTable,
  IDataTableColumn,
  MonoCell,
  TruncatedCell,
  StatusPill,
  SlaPill,
  EmptyState,
  StatusBanner,
  TicketStatus,
} from '../ui';

export interface ISharedWithMeProps {
  service: IOneDeskDataService;
  email: string;
  onSelectTicket: (ticketNumber: string) => void;
}

interface IRow {
  ticket: ITicket;
  role: string;
}

/**
 * Phase 5 (build_plan.md) - the only way a concerned/watcher/approver
 * reaches a ticket that's neither theirs nor their department's. Excludes
 * tickets they raised themselves, so it never duplicates My Tickets.
 */
const SharedWithMe: React.FC<ISharedWithMeProps> = ({ service, email, onSelectTicket }) => {
  const [rows, setRows] = React.useState<IRow[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(undefined);

    service
      .getTicketsForParticipant(email)
      .then(async (tickets) => {
        const sharedOnly = tickets.filter((t) => normalizeEmail(t.RequesterEmail) !== normalizeEmail(email));
        const withRoles = await Promise.all(
          sharedOnly.map(async (ticket): Promise<IRow> => {
            const participants = await service.getParticipants(ticket.TicketNumber);
            const mine = participants.find((p) => normalizeEmail(p.Email) === normalizeEmail(email));
            return { ticket, role: mine?.Role || 'Concerned' };
          })
        );
        if (!cancelled) setRows(withRoles);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load shared tickets.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [service, email]);

  const columns: Array<IDataTableColumn<IRow>> = [
    { key: 'number', header: 'Ticket #', width: '152px', isRowHeader: true, render: ({ ticket }) => <MonoCell>{ticket.TicketNumber}</MonoCell> },
    { key: 'subject', header: 'Subject', width: 'auto', render: ({ ticket }) => <TruncatedCell title={ticket.Title}>{ticket.Title}</TruncatedCell> },
    { key: 'status', header: 'Status', width: '176px', render: ({ ticket }) => <StatusPill status={ticket.Status as TicketStatus} audience="employee" /> },
    { key: 'sla', header: 'SLA', width: '108px', render: ({ ticket }) => <SlaPill state={getSlaState(ticket)} label={slaLabel(ticket)} /> },
    { key: 'requester', header: 'Raised by', width: '200px', render: ({ ticket }) => <TruncatedCell title={ticket.RequesterEmail}>{ticket.RequesterEmail}</TruncatedCell> },
    { key: 'role', header: 'Your role', width: '120px', render: ({ role }) => role },
  ];

  return (
    <section className={styles.sharedWithMe}>
      <PageHeader title="Shared with me" subtitle="Tickets you were added to as a concerned person. Read-only, for your awareness." />

      {error && <StatusBanner tone="danger">{error}</StatusBanner>}

      {!error && (
        <DataTable
          caption={`Shared with me, ${rows.length} tickets`}
          columns={columns}
          rows={rows}
          rowKey={(r) => r.ticket.TicketNumber}
          onRowSelect={(r) => onSelectTicket(r.ticket.TicketNumber)}
          loading={loading}
          empty={<EmptyState title="Nothing has been shared with you yet" />}
          footer={<span>{rows.length} ticket{rows.length === 1 ? '' : 's'} · you will stop seeing one only if the desk removes you from it.</span>}
        />
      )}
    </section>
  );
};

export default SharedWithMe;
