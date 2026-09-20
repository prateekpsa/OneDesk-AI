import * as React from 'react';
import styles from './OnedeskConsole.module.scss';
import type { IOnedeskConsoleProps } from './IOnedeskConsoleProps';
import { IOneDeskDataService } from '../services/IOneDeskDataService';
import { SharePointDataService } from '../services/SharePointDataService';
import { MockDataService } from '../services/MockDataService';
import { TEAM, normalizeEmail } from '../services/config';
import { useUserRole } from '../hooks/useUserRole';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import type { IUserRole } from '../models/IUserRole';
import {
  ConsoleShell,
  Topbar,
  SideNav,
  ISideNavGroup,
  ISideNavItem,
  Select,
  Button,
  StatusBanner,
  IconName
} from './ui';
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

const NAV_META: Record<ViewKey, { label: string; icon: IconName }> = {
  dashboard: { label: 'Dashboard', icon: 'dashboard' },
  queue: { label: 'Queue', icon: 'queue' },
  knowledge: { label: 'Knowledge review', icon: 'knowledge' },
  newTicket: { label: 'Raise a ticket', icon: 'plusCircle' },
  myTickets: { label: 'My tickets', icon: 'ticket' },
  sharedWithMe: { label: 'Shared with me', icon: 'people' },
  userLookup: { label: 'User lookup', icon: 'userSearch' }
};

interface INavCounts {
  queue?: number;
  knowledge?: number;
  myTickets?: number;
  sharedWithMe?: number;
}

function visibleViewsFor(role: IUserRole): ViewKey[] {
  if (role.kind === 'employee') return EMPLOYEE_VIEWS;
  if (role.kind === 'staff') return [...STAFF_VIEWS, ...EMPLOYEE_VIEWS];
  return [...STAFF_VIEWS, ...EMPLOYEE_VIEWS, 'userLookup'];
}

function defaultViewFor(role: IUserRole): ViewKey {
  return role.kind === 'employee' ? 'newTicket' : 'dashboard';
}

function backLabelFor(origin: ViewKey | undefined): string {
  if (origin === 'dashboard') return 'Back to Dashboard';
  if (origin === 'myTickets') return 'Back to My Tickets';
  if (origin === 'sharedWithMe') return 'Back to Shared with me';
  if (origin === 'userLookup') return 'Back to User Lookup';
  return 'Back to Queue';
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/** The sidebar's pinned "Your scope" note - what this person can act on from where they're standing. */
function scopeNoteFor(view: ViewKey, role: IUserRole, team: string | undefined): { value: string; note: string } {
  const value = role.kind === 'admin' ? 'Super admin' : role.kind === 'staff' ? `${role.team} department` : 'Employee';

  if (view === 'knowledge') {
    return { value, note: team ? `You review ${team} drafts only.` : "You review every department's drafts." };
  }
  if (view === 'userLookup') {
    return { value, note: "Lookup is read-only. It never changes anyone's access." };
  }
  if (role.kind === 'admin' && !team) {
    return { value, note: 'Every action outside your own desk is written to the audit log as an override.' };
  }
  if (role.kind === 'employee') {
    return { value, note: 'You can raise tickets and track your own.' };
  }
  return { value, note: `You can act on ${team} tickets. Other desks are read-only.` };
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
  const [navCounts, setNavCounts] = React.useState<INavCounts>({});

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

  // Sidebar badge counts. A convenience layer on top of tabs that already
  // fetch this same data themselves - if it fails, the badges just stay
  // blank rather than blocking the console.
  const refetchNavCounts = React.useCallback((): void => {
    if (!role) return;
    const team = role.kind === 'admin' ? (scope === ALL_TEAMS ? undefined : scope) : role.team;
    Promise.all([
      role.kind !== 'employee' ? service.getDashboardCounts(team) : Promise.resolve(undefined),
      service.getTickets({ requesterEmail: actorEmail }),
      service.getTicketsForParticipant(actorEmail)
    ])
      .then(([dashboardCounts, myTickets, sharedTickets]) => {
        setNavCounts({
          queue: dashboardCounts?.openOnMyTeam,
          knowledge: dashboardCounts?.knowledgeDraftsWaiting,
          myTickets: myTickets.length,
          sharedWithMe: sharedTickets.filter((t) => normalizeEmail(t.RequesterEmail) !== normalizeEmail(actorEmail)).length
        });
      })
      .catch(() => {
        /* badges are a convenience, not a critical read - swallow and keep them blank */
      });
  }, [service, role, scope, actorEmail]);

  useAutoRefresh(refetchNavCounts, 15000, [refetchNavCounts]);

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
      <ConsoleShell>
        <div className={styles.identityLoading}>
          <p className={styles.identity}>Checking your access…</p>
        </div>
      </ConsoleShell>
    );
  }

  const visibleViews = visibleViewsFor(role);
  const teamForStaffViews = role.kind === 'admin' ? (scope === ALL_TEAMS ? undefined : scope) : role.team;
  // While a ticket is open the tabs themselves aren't "active", but the tab it
  // was opened from still should be - matching the reference design rather
  // than leaving every tab unlit.
  const activeKey: ViewKey | undefined = selectedTicket ? ticketOrigin : view;

  const buildItem = (key: ViewKey, badge: number | undefined): ISideNavItem => ({
    key,
    label: NAV_META[key].label,
    icon: NAV_META[key].icon,
    badge,
    active: activeKey === key,
    onClick: () => openTab(key)
  });

  const deskItems = STAFF_VIEWS.filter((k) => visibleViews.indexOf(k) !== -1).map((k) =>
    buildItem(k, k === 'queue' ? navCounts.queue : k === 'knowledge' ? navCounts.knowledge : undefined)
  );
  const adminItems =
    visibleViews.indexOf('userLookup') !== -1 ? [buildItem('userLookup', undefined)] : [];
  const ticketItems = EMPLOYEE_VIEWS.map((k) =>
    buildItem(k, k === 'myTickets' ? navCounts.myTickets : k === 'sharedWithMe' ? navCounts.sharedWithMe : undefined)
  );

  const navGroups: ISideNavGroup[] = [
    ...(deskItems.length > 0 ? [{ label: role.kind === 'admin' ? 'Every desk' : 'My desk', items: deskItems }] : []),
    ...(adminItems.length > 0 ? [{ label: 'Administration', items: adminItems }] : []),
    { label: 'My tickets', items: ticketItems }
  ];

  const scopeNote = scopeNoteFor(view, role, teamForStaffViews);

  return (
    <ConsoleShell>
      <Topbar
        liveLabel={useMockData ? `Sample data${simulatedScope ? ` · Simulating ${simulatedScope}` : ''}` : 'Live · SharePoint'}
        liveTone={useMockData ? 'sample' : 'live'}
        userName={displayName}
        userRoleLine={role.kind === 'staff' ? `${role.team} desk · Staff` : role.kind === 'admin' ? 'Super admin' : 'Employee'}
        userInitials={initialsOf(displayName)}
        scopePicker={
          role.kind === 'admin' ? (
            <Select
              className={styles.scopeSelect}
              label="Department scope"
              labelHidden
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              options={TEAMS.map((t) => ({ value: t, label: t }))}
              placeholderOption="All departments"
            />
          ) : undefined
        }
      />

      <div className={styles.layout}>
        <SideNav groups={navGroups} scopeCard={{ label: 'Your scope', value: scopeNote.value, note: scopeNote.note }} />

        <main className={styles.main}>
          {roleError && (
            <StatusBanner tone="danger" action={<Button size="sm" onClick={retry}>Retry</Button>}>
              {roleError}
            </StatusBanner>
          )}

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
              {view === 'dashboard' && (
                <Dashboard
                  service={service}
                  team={teamForStaffViews}
                  onNavigate={openTab}
                  onSelectTicket={(n) => openTicket(n, 'dashboard')}
                  onNavigateToDepartment={(dept) => {
                    setScope(dept);
                    openTab('queue');
                  }}
                />
              )}
              {view === 'queue' && (
                <Queue service={service} team={teamForStaffViews} onSelectTicket={(n) => openTicket(n, 'queue')} />
              )}
              {view === 'knowledge' && <KnowledgeReview service={service} actorEmail={actorEmail} department={teamForStaffViews} />}
              {view === 'newTicket' && (
                <NewTicketForm service={service} requesterEmail={actorEmail} requesterName={displayName} role={role} />
              )}
              {view === 'myTickets' && (
                <MyTickets
                  service={service}
                  requesterEmail={actorEmail}
                  onSelectTicket={(n) => openTicket(n, 'myTickets')}
                  onRaiseTicket={() => openTab('newTicket')}
                />
              )}
              {view === 'sharedWithMe' && (
                <SharedWithMe service={service} email={actorEmail} onSelectTicket={(n) => openTicket(n, 'sharedWithMe')} />
              )}
              {view === 'userLookup' && <UserLookup service={service} onSelectTicket={(n) => openTicket(n, 'userLookup')} />}
            </>
          )}
        </main>
      </div>
    </ConsoleShell>
  );
};

export default OnedeskConsole;
