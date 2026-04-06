import { promises as fs } from 'fs';
import path from 'path';

import ListingsBoard, { type Listing } from './listings-board';

export const dynamic = 'force-static';

const CATEGORY_ORDER: Listing['category'][] = ['internship', 'new-grad', 'program'];

export default async function Home() {
  let listings: Listing[] = [];

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    listings = JSON.parse(fileContents);
  } catch (error) {
    console.warn('No data.json found or error parsing.', error);
  }

  const categorizedListings = listings
    .filter((listing): listing is Listing => CATEGORY_ORDER.includes(listing.category))
    .sort((left, right) => (
      (left.firstSeenAt ?? left.dateScraped).localeCompare(right.firstSeenAt ?? right.dateScraped)
    ));

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    jobs: categorizedListings.filter((listing) => listing.category === category),
  }));

  const featuredCompanies = Array.from(
    new Set(categorizedListings.map((listing) => listing.company)),
  ).slice(0, 10);

  const highlightCards = [
    {
      label: 'Internships',
      value: groups.find((group) => group.category === 'internship')?.jobs.length ?? 0,
      tone: 'internship',
    },
    {
      label: 'New Grad',
      value: groups.find((group) => group.category === 'new-grad')?.jobs.length ?? 0,
      tone: 'new-grad',
    },
    {
      label: 'Programs',
      value: groups.find((group) => group.category === 'program')?.jobs.length ?? 0,
      tone: 'program',
    },
  ] as const;

  return (
    <section className="hero">
      <div className="hero-shell">
        <div className="hero-card hero-card-primary">
          <p className="hero-eyebrow">Quant Board</p>
          <h1 className="page-title">A cleaner way to track quant internships, new grad roles, and programs.</h1>
          <p className="page-desc">
            This board pulls direct postings from quant firms and keeps them organized, so you do not have to dig through career pages one by one.
          </p>

          <div className="hero-pill-row" aria-label="Board highlights">
            <span className="hero-pill">Direct posting links</span>
            <span className="hero-pill">Student-focused roles</span>
            <span className="hero-pill">Programs and events included</span>
          </div>
        </div>

        <aside className="hero-rail">
          <div className="hero-card hero-card-secondary">
            <p className="hero-panel-label">Board snapshot</p>
            <div className="hero-note-grid">
              {highlightCards.map((card) => (
                <div className={`hero-note hero-note-${card.tone}`} key={card.label}>
                  <span className="hero-note-label">{card.label}</span>
                  <span className="hero-note-value">{card.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-card hero-card-secondary">
            <p className="hero-panel-label">What is on the board</p>
            <div className="hero-list">
              <p>Internships and new grad openings that look relevant for CS, software, data, or quant-heavy students.</p>
              <p>Programs, summits, fellowships, and recruiting events are grouped together in one tab.</p>
            </div>
          </div>

          <div className="hero-card hero-card-secondary">
            <p className="hero-panel-label">Firms showing up right now</p>
            <div className="company-cloud">
              {featuredCompanies.map((company) => (
                <span className="company-chip" key={company}>{company}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {categorizedListings.length === 0 ? (
        <div className="empty-state">
          No listings are available right now.
        </div>
      ) : (
        <ListingsBoard groups={groups} />
      )}
    </section>
  );
}
