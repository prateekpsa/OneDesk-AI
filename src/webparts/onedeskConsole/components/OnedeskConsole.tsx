import * as React from 'react';
import styles from './OnedeskConsole.module.scss';
import type { IOnedeskConsoleProps } from './IOnedeskConsoleProps';
import { IOneDeskDataService } from '../services/IOneDeskDataService';
import { SharePointDataService } from '../services/SharePointDataService';
import { MockDataService } from '../services/MockDataService';
import { TEAM } from '../services/config';
import { useUserRole } from '../hooks/useUserRole';
import type { IUserRole } from '../models/IUserRole';
import Dashboard from './Dashboard';
import Queue from './Queue';
import TicketDetail from './TicketDetail';
import KnowledgeReview from './KnowledgeReview';
import NewTicketForm from './employee/NewTicketForm';
import MyTickets from './employee/MyTickets';
import SharedWithMe from './employee/SharedWithMe';
import UserLookup from './admin/UserLookup';

const TEAMS = [TEAM.IT, TEAM.HR, TEAM.ADMIN, TEAM.ANALYTICS, TEAM.FINANCE, TEAM.OTHER];
const ALL_TEAMS = '__all__';

type ViewKey = 'dashboard' | 'queue' | 'knowledge' | 'newTicket' | 'myTickets' | 'sharedWithMe' | 'userLookup';
const STAFF_VIEWS: ViewKey[] = ['dashboard', 'queue', 'knowledge'];
const EMPLOYEE_VIEWS: ViewKey[] = ['newTicket', 'myTickets', 'sharedWithMe'];

const NAV_ITEMS: { key: ViewKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'queue', label: 'Queue' },
  { key: 'knowledge', label: 'Knowledge Review' },
  { key: 'newTicket', label: 'Raise a Ticket' },
  { key: 'myTickets', label: 'My Tickets' },
  { key: 'sharedWithMe', label: 'Shared with me' },
  { key: 'userLookup', label: 'User Lookup' },
];

function visibleViewsFor(role: IUserRole): ViewKey[] {
  if (role.kind === 'employee') return EMPLOYEE_VIEWS;
  if (role.kind === 'staff') return [...STAFF_VIEWS, ...EMPLOYEE_VIEWS];
  return [...STAFF_VIEWS, ...EMPLOYEE_VIEWS, 'userLookup'];
}

function defaultViewFor(role: IUserRole): ViewKey {
  return role.kind === 'employee' ? 'newTicket' : 'dashboard';
}

function backLabelFor(origin: ViewKey | undefined): string {
  if (origin === 'myTickets') return 'Back to My Tickets';
  if (origin === 'sharedWithMe') return 'Back to Shared with me';
  if (origin === 'userLookup') return 'Back to User Lookup';
  return 'Back to Queue';
}

/**
 * Console shell (build_plan.md Phase 4, role-scoped in Phase 5) - resolves
 * the signed-in person's role once, then shows only the tabs/data/actions
 * that role is allowed. A ticket opened from any list shows full access,
 * read-only, or nothing at all, depending on who's looking - see
 * TicketDetail.
 */
const OnedeskConsole: React.FC<IOnedeskConsoleProps> = ({ context, useMockData, simulatedScope }) => {
  const [scope, setScope] = React.useState<string>(ALL_TEAMS);
  const [view, setView] = React.useState<ViewKey>('dashboard');
  const [selectedTicket, setSelectedTicket] = React.useState<string | undefined>(undefined);
  const [ticketOrigin, setTicketOrigin] = React.useState<ViewKey | undefined>(undefined);

  const service: IOneDeskDataService = React.useMemo(
    () =>
      useMockData
        ? new MockDataService(context.pageContext.user.email, simulatedScope)
        : new SharePointDataService(context),
    [useMockData, context, simulatedScope]
  );
  const actorEmail = context.pageContext.user.email;
  const displayName = context.pageContext.user.displayName;

  const { role, loading: roleLoading, error: roleError, retry } = useUserRole(service, actorEmail, displayName);

  // Whenever the resolved role's kind changes (first load, or the
  // sample-data role simulator switching persona) land on that role's
  // default tab/scope and drop any open ticket - don't leave someone
  // sitting on a Dashboard tab that's about to disappear.
  React.useEffect(() => {
    if (!role) return;
    setView(defaultViewFor(role));
    setScope(role.kind === 'staff' && role.team ? role.team : ALL_TEAMS);
    setSelectedTicket(undefined);
    setTicketOrigin(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role?.kind]);

  const openTab = (next: ViewKey): void => {
    setSelectedTicket(undefined);
    setTicketOrigin(undefined);
    setView(next);
  };

  const openTicket = (ticketNumber: string, origin: ViewKey): void => {
    setTicketOrigin(origin);
    setSelectedTicket(ticketNumber);
  };

  if (roleLoading || !role) {
    return (
      <section className={styles.onedeskConsole}>
        <header className={styles.header}>
          <h2 className={styles.heading}>OneDesk console</h2>
        </header>
        <p className={styles.identity}>Checking your access...</p>
      </section>
    );
  }

  const visibleViews = visibleViewsFor(role);
  const teamForStaffViews = role.kind === 'admin' ? (scope === ALL_TEAMS ? undefined : scope) : role.team;

  return (
    <section className={styles.onedeskConsole}>
      <header className={styles.header}>
        <h2 className={styles.heading}>OneDesk console</h2>
        <span className={useMockData ? styles.badgeMock : styles.badgeLive}>
          {useMockData ? `Sample data${simulatedScope ? ` · Simulating ${simulatedScope}` : ''}` : 'Live SharePoint'}
        </span>
      </header>

      <p className={styles.identity}>Signed in as {displayName}</p>
      {roleError && (
        <p className={styles.error}>
          {roleError}{' '}
          <button className={styles.retry} onClick={retry}>
            Retry
          </button>
        </p>
      )}

      <div className={styles.toolbar}>
        {STAFF_VIEWS.indexOf(view) !== -1 && role.kind === 'staff' && (
          <div className={styles.teamPicker}>
            <span>Team: {role.team}</span>
          </div>
        )}
        {STAFF_VIEWS.indexOf(view) !== -1 && role.kind === 'admin' && (
          <div className={styles.teamPicker}>
            <label htmlFor="teamSelect">Team:</label>
            <select id="teamSelect" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value={ALL_TEAMS}>All departments</option>
              {TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className={styles.nav}>
          {NAV_ITEMS.filter((item) => visibleViews.indexOf(item.key) !== -1).map((item) => (
            <button
              key={item.key}
              className={view === item.key && !selectedTicket ? styles.navActive : ''}
              onClick={() => openTab(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {selectedTicket ? (
        <TicketDetail
          service={service}
          ticketNumber={selectedTicket}
          role={role}
          onBack={() => setSelectedTicket(undefined)}
          backLabel={backLabelFor(ticketOrigin)}
        />
      ) : (
        <>
          {view === 'dashboard' && <Dashboard service={service} team={teamForStaffViews} />}
          {view === 'queue' && (
            <Queue service={service} team={teamForStaffViews} onSelectTicket={(n) => openTicket(n, 'queue')} />
          )}
          {view === 'knowledge' && <KnowledgeReview service={service} actorEmail={actorEmail} department={teamForStaffViews} />}
          {view === 'newTicket' && (
            <NewTicketForm service={service} requesterEmail={actorEmail} requesterName={displayName} role={role} />
          )}
          {view === 'myTickets' && (
            <MyTickets service={service} requesterEmail={actorEmail} onSelectTicket={(n) => openTicket(n, 'myTickets')} />
          )}
          {view === 'sharedWithMe' && (
            <SharedWithMe service={service} email={actorEmail} onSelectTicket={(n) => openTicket(n, 'sharedWithMe')} />
          )}
          {view === 'userLookup' && <UserLookup service={service} onSelectTicket={(n) => openTicket(n, 'userLookup')} />}
        </>
      )}
    </section>
  );
};

export default OnedeskConsole;
