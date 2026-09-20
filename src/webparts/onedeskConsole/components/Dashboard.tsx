import * as React from 'react';
import styles from './Dashboard.module.scss';
import type { IOneDeskDataService } from '../services/IOneDeskDataService';
import type { IDashboardCounts } from '../models/IDashboardCounts';
import type { IKnowledgeArticle } from '../models/IKnowledgeArticle';
import type { ICommittee } from '../models/ICommittee';
import { ARTICLE_STATUS } from '../services/config';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const REFRESH_MS = 15000;

const EMPTY_COUNTS: IDashboardCounts = {
  openOnMyTeam: 0,
  newUnassigned: 0,
  pendingEmployeeConfirmation: 0,
  slaBreaching: 0,
  knowledgeDraftsWaiting: 0,
};

export interface IDashboardProps {
  service: IOneDeskDataService;
  /** undefined means "all departments" - the admin view. */
  team?: string;
}

/** Phase 4 screen 1 (build_plan.md) - tile counts + knowledge drafts + committees for the selected team. */
const Dashboard: React.FC<IDashboardProps> = ({ service, team }) => {
  const [counts, setCounts] = React.useState<IDashboardCounts>(EMPTY_COUNTS);
  const [knowledgeDrafts, setKnowledgeDrafts] = React.useState<IKnowledgeArticle[]>([]);
  const [committees, setCommittees] = React.useState<ICommittee[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | undefined>(undefined);

  const refetch = React.useCallback((): void => {
    setError(undefined);
    Promise.all([
      service.getDashboardCounts(team),
      // Matches the tile above it, or the two would visibly disagree.
      service.getKnowledgeArticles({ articleStatus: ARTICLE_STATUS.DRAFT, department: team }),
      service.getCommittees(),
    ])
      .then(([dashboardCounts, drafts, committeeRows]) => {
        setCounts(dashboardCounts);
        setKnowledgeDrafts(drafts);
        setCommittees(committeeRows);
      })
      .catch((err: Error) => setError(err.message || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, [service, team]);

  useAutoRefresh(refetch, REFRESH_MS, [refetch]);

  if (error) return <p className={styles.error}>Error: {error}</p>;
  if (loading) return <p>Loading...</p>;

  return (
    <section>
      <div className={styles.tiles}>
        <div className={styles.tile}>
          <div className={styles.tileValue}>{counts.openOnMyTeam}</div>
          <div className={styles.tileLabel}>Open on {team || 'all departments'}</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tileValue}>{counts.newUnassigned}</div>
          <div className={styles.tileLabel}>New / unassigned</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tileValue}>{counts.pendingEmployeeConfirmation}</div>
          <div className={styles.tileLabel}>Pending confirmation</div>
        </div>
        <div className={`${styles.tile} ${counts.slaBreaching > 0 ? styles.tileDanger : ''}`}>
          <div className={styles.tileValue}>{counts.slaBreaching}</div>
          <div className={styles.tileLabel}>SLA breaching</div>
        </div>
        <div className={styles.tile}>
          <div className={styles.tileValue}>{counts.knowledgeDraftsWaiting}</div>
          <div className={styles.tileLabel}>Knowledge drafts</div>
        </div>
      </div>

      <h3 className={styles.sectionHeading}>Knowledge drafts waiting</h3>
      <ul>
        {knowledgeDrafts.map((a) => (
          <li key={a.Id}>{a.Title}</li>
        ))}
        {knowledgeDrafts.length === 0 && <li>None.</li>}
      </ul>

      <h3 className={styles.sectionHeading}>Committees</h3>
      <ul>
        {committees.map((c) => (
          <li key={c.Id}>{c.CommitteeName}</li>
        ))}
      </ul>
    </section>
  );
};

export default Dashboard;
