import * as React from 'react';
import styles from './UserLookup.module.scss';
import type { IOneDeskDataService } from '../../services/IOneDeskDataService';
import type { ITicket } from '../../models/ITicket';
import { deriveRole, normalizeEmail } from '../../services/config';
import {
  PageHeader,
  SectionHeading,
  SearchInput,
  Button,
  Pill,
  DataTable,
  IDataTableColumn,
  MonoCell,
  TruncatedCell,
  StatusPill,
  EmptyState,
  StatusBanner,
  TicketStatus,
} from '../ui';

export interface IUserLookupProps {
  service: IOneDeskDataService;
  onSelectTicket: (ticketNumber: string) => void;
}

interface ISharedRow {
  ticket: ITicket;
  addedBy?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function raisedColumns(onSelectTicket: (ticketNumber: string) => void): Array<IDataTableColumn<ITicket>> {
  return [
    { key: 'number', header: 'Ticket #', width: '152px', isRowHeader: true, render: (t) => <MonoCell>{t.TicketNumber}</MonoCell> },
    { key: 'subject', header: 'Subject', width: 'auto', render: (t) => <TruncatedCell title={t.Title}>{t.Title}</TruncatedCell> },
    { key: 'status', header: 'Status', width: '96px', render: (t) => <StatusPill status={t.Status as TicketStatus} /> },
  ];
}

function sharedColumns(onSelectTicket: (ticketNumber: string) => void): Array<IDataTableColumn<ISharedRow>> {
  return [
    { key: 'number', header: 'Ticket #', width: '152px', isRowHeader: true, render: (r) => <MonoCell>{r.ticket.TicketNumber}</MonoCell> },
    { key: 'subject', header: 'Subject', width: 'auto', render: (r) => <TruncatedCell title={r.ticket.Title}>{r.ticket.Title}</TruncatedCell> },
    { key: 'addedBy', header: 'Added by', width: '150px', render: (r) => <TruncatedCell title={r.addedBy}>{r.addedBy || '—'}</TruncatedCell> },
  ];
}

/** Phase 5 (build_plan.md), admin only - look up any person's department/role and their tickets. */
const UserLookup: React.FC<IUserLookupProps> = ({ service, onSelectTicket }) => {
  const [email, setEmail] = React.useState<string>('');
  const [searching, setSearching] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [scopeLabel, setScopeLabel] = React.useState<string | undefined>(undefined);
  const [searchedEmail, setSearchedEmail] = React.useState<string>('');
  const [raised, setRaised] = React.useState<ITicket[] | undefined>(undefined);
  const [shared, setShared] = React.useState<ISharedRow[] | undefined>(undefined);

  const raisedCols = React.useMemo(() => raisedColumns(onSelectTicket), [onSelectTicket]);
  const sharedCols = React.useMemo(() => sharedColumns(onSelectTicket), [onSelectTicket]);

  const search = (): void => {
    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }

    setSearching(true);
    setError(undefined);
    setRaised(undefined);
    setShared(undefined);

    Promise.all([service.getCallerProfile(trimmed), service.getTickets({ requesterEmail: trimmed }), service.getTicketsForParticipant(trimmed)])
      .then(async ([profile, raisedTickets, participantTickets]) => {
        const role = deriveRole(profile.userScope);
        setScopeLabel(role.kind === 'admin' ? 'Super admin' : role.kind === 'staff' ? `${role.team} team` : 'User — no desk');
        setSearchedEmail(trimmed);
        setRaised(raisedTickets);

        const sharedTickets = participantTickets.filter((t) => normalizeEmail(t.RequesterEmail) !== normalizeEmail(trimmed));
        const sharedRows = await Promise.all(
          sharedTickets.map(async (ticket): Promise<ISharedRow> => {
            const participants = await service.getParticipants(ticket.TicketNumber);
            const mine = participants.find((p) => normalizeEmail(p.Email) === normalizeEmail(trimmed));
            return { ticket, addedBy: mine?.AddedBy };
          })
        );
        setShared(sharedRows);
      })
      .catch((err: Error) => setError(err.message || 'Lookup failed.'))
      .finally(() => setSearching(false));
  };

  return (
    <section className={styles.userLookup}>
      <PageHeader title="User lookup" subtitle={'Answer "what has this person raised, and what can they see?" without opening SharePoint.'} />

      <div className={styles.searchRow}>
        <SearchInput
          fieldClassName={styles.searchInput}
          label="Work email"
          placeholder="person@preferredsquare.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
        />
        <Button variant="primary" busy={searching} onClick={search}>
          Search
        </Button>
      </div>

      {error && <StatusBanner tone="danger">{error}</StatusBanner>}

      {scopeLabel && raised && shared && (
        <>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIdentity}>
              <span className={styles.summaryEmail}>{searchedEmail}</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryStat}>
              <span className={styles.summaryLabel}>Scope</span>
              <Pill tone="neutral">{scopeLabel}</Pill>
            </div>
            <div className={styles.summaryStat}>
              <span className={styles.summaryLabel}>Raised</span>
              <span className={styles.summaryValue}>{raised.length} tickets</span>
            </div>
            <div className={styles.summaryStat}>
              <span className={styles.summaryLabel}>Shared with them</span>
              <span className={styles.summaryValue}>{shared.length} tickets</span>
            </div>
            <div className={styles.summarySpacer} />
            <span className={styles.summaryNote}>Scope comes from StaffDirectory. Changing it is a SharePoint task, not a console one.</span>
          </div>

          <div className={styles.tables}>
            <section className={styles.tablePanel}>
              <SectionHeading aside={<span className={styles.tableAside}>Newest first</span>}>Raised by this person</SectionHeading>
              <DataTable
                caption={`Raised by ${searchedEmail}`}
                columns={raisedCols}
                rows={raised}
                rowKey={(t) => t.TicketNumber}
                onRowSelect={(t) => onSelectTicket(t.TicketNumber)}
                empty={<EmptyState title="No tickets found for that address" />}
                minWidth={380}
              />
            </section>

            <section className={styles.tablePanel}>
              <SectionHeading aside={<span className={styles.tableAside}>Added as a concerned person</span>}>Shared with this person</SectionHeading>
              <DataTable
                caption={`Shared with ${searchedEmail}`}
                columns={sharedCols}
                rows={shared}
                rowKey={(r) => r.ticket.TicketNumber}
                onRowSelect={(r) => onSelectTicket(r.ticket.TicketNumber)}
                empty={<EmptyState title="Nothing has been shared with this person" />}
                footer={<span>Concerned people can read these tickets. They cannot act on them.</span>}
                minWidth={420}
              />
            </section>
          </div>
        </>
      )}
    </section>
  );
};

export default UserLookup;
