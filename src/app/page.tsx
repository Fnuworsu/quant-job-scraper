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

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="hero-eyebrow">Quant Board</p>
        <h1 className="page-title">Quant jobs, programs, and events in one place.</h1>
        <p className="page-desc">
          A simple board for tracking quant internships, new grad roles, programs, and recruiting events from top firms.
        </p>
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
