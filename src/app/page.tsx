import { promises as fs } from 'fs';
import path from 'path';

import ListingsBoard, { type Listing } from './listings-board';

export const dynamic = 'force-static';

const CATEGORY_ORDER: Listing['category'][] = ['job', 'program', 'event'];

export default async function Home() {
  let jobs: Listing[] = [];

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    jobs = JSON.parse(fileContents);
  } catch (error) {
    console.warn('No data.json found or error parsing.', error);
  }

  const categorizedJobs = jobs
    .filter((job) => job.category !== null)
    .sort((left, right) => (
      (left.firstSeenAt ?? left.dateScraped).localeCompare(right.firstSeenAt ?? right.dateScraped)
    ));
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    jobs: categorizedJobs.filter((job) => job.category === category),
  }));
  const featuredCompanies = Array.from(
    new Set(categorizedJobs.map((job) => job.company)),
  ).slice(0, 6);
  const totalListings = categorizedJobs.length;

  return (
    <section className="hero">
      <div className="hero-shell">
        <div className="hero-copy">
          <p className="hero-eyebrow">Quant Board</p>
          <h1 className="page-title">Quant jobs, programs, and events in one place.</h1>
          <p className="page-desc">
            A simple board for tracking quant internships, new grad roles, programs, and recruiting events from top firms.
          </p>
        </div>

        <aside className="hero-panel">
          <p className="hero-panel-label">Board overview</p>
          <div className="hero-stats">
            <div className="hero-stat-card">
              <span className="hero-stat-value">{groups[0]?.jobs.length ?? 0}</span>
              <span className="hero-stat-label">Jobs</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-value">{groups[1]?.jobs.length ?? 0}</span>
              <span className="hero-stat-label">Programs</span>
            </div>
            <div className="hero-stat-card">
              <span className="hero-stat-value">{groups[2]?.jobs.length ?? 0}</span>
              <span className="hero-stat-label">Events</span>
            </div>
          </div>

          <div className="hero-panel-section">
            <p className="hero-panel-title">{totalListings} live listings right now</p>
            <p className="hero-panel-copy">
              Browse openings and opportunities across some of the most competitive quant firms, all in one board.
            </p>
          </div>

          <div className="hero-panel-section">
            <p className="hero-panel-title">Firms on the board</p>
            <div className="company-cloud">
              {featuredCompanies.map((company) => (
                <span className="company-chip" key={company}>{company}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {categorizedJobs.length === 0 ? (
        <div className="empty-state">
          No listings are available right now.
        </div>
      ) : (
        <ListingsBoard groups={groups} />
      )}
    </section>
  );
}
