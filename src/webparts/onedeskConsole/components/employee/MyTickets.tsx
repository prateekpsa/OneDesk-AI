import * as React from 'react';
import styles from './MyTickets.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import {
  PageHeader,
  DataTable,
  IDataTableColumn,
  MonoCell,
  TruncatedCell,
  StatusPill,
  Button,
  EmptyState,
  StatusBanner,
  TicketStatus,
} from '../ui';

const REFRESH_MS = 15000;

export interface IMyTicketsProps {
  service: IOneDeskDataService;
  requesterEmail: string;
  onSelectTicket: (ticketNumber: string) => void;
  /** Wires the header's "Raise a ticket" button to the real nav; omitted, the button is hidden. */
  onRaiseTicket?: () => void;
}

function createdDesc(a: ITicket, b: ITicket): number {
  return new Date(b.TicketCreatedDate || 0).getTime() - new Date(a.TicketCreatedDate || 0).getTime();
}

function relativeFromNow(iso?: string): string {
  if (!iso) return '—';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? 'Last week' : `${weeks} weeks ago`;
}

/** Phase 6 (build_plan.md) - read-only list of tickets the signed-in employee raised. */
const MyTickets: React.FC<IMyTicketsProps> = ({ service, requesterEmail, onSelectTicket, onRaiseTicket }) => {
  const [tickets, setTickets] = React.useState<ITicket[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const refetch = React.useCallback((): void => {
    setError(undefined);
    service
      .getTickets({ requesterEmail })
      .then((rows) => setTickets([...rows].sort(createdDesc)))
      .catch((err: Error) => setError(err.message || 'Failed to load your tickets.'))
      .finally(() => setLoading(false));
  }, [service, requesterEmail]);

  useAutoRefresh(refetch, REFRESH_MS, [refetch]);

  const columns: Array<IDataTableColumn<ITicket>> = [
    { key: 'number', header: 'Ticket #', width: '152px', isRowHeader: true, render: (t) => <MonoCell>{t.TicketNumber}</MonoCell> },
    { key: 'subject', header: 'Subject', width: 'auto', render: (t) => <TruncatedCell title={t.Title}>{t.Title}</TruncatedCell> },
    { key: 'desk', header: 'Desk', width: '92px', render: (t) => <TruncatedCell muted title={t.CurrentOwnerTeam}>{t.CurrentOwnerTeam}</TruncatedCell> },
    { key: 'status', header: 'Where it is', width: '200px', render: (t) => <StatusPill status={t.Status as TicketStatus} audience="employee" /> },
    { key: 'updated', header: 'Last update', width: '116px', render: (t) => relativeFromNow(t.Modified || t.TicketCreatedDate) },
  ];

  return (
    <section className={styles.myTickets}>
      <PageHeader
        title="My tickets"
        subtitle="Everything you have raised, most recent first."
        actions={
          onRaiseTicket && (
            <Button variant="primary" iconBefore="plusCircle" onClick={onRaiseTicket}>
              Raise a ticket
            </Button>
          )
        }
      />

      {error && <StatusBanner tone="danger">{error}</StatusBanner>}

      {!error && (
        <DataTable
          caption={`My tickets, ${tickets.length} raised`}
          columns={columns}
          rows={tickets}
          rowKey={(t) => t.TicketNumber}
          onRowSelect={(t) => onSelectTicket(t.TicketNumber)}
          loading={loading}
          empty={<EmptyState title="You haven't raised any tickets yet" />}
          footer={
            <span>You only ever see tickets you raised. Nothing here can be edited — staff change the status, you confirm the fix.</span>
          }
        />
      )}
    </section>
  );
};

export default MyTickets;
