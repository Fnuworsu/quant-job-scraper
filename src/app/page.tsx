import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

interface Job {
  company: string;
  title: string;
  url: string;
  category: 'job' | 'program' | 'event' | null;
  jobTrack: 'internship' | 'new-grad' | null;
  firstSeenAt?: string;
  dateScraped: string;
}

const CATEGORY_ORDER: Array<NonNullable<Job['category']>> = ['job', 'program', 'event'];
const CATEGORY_COPY: Record<NonNullable<Job['category']>, { label: string; description: string; badge: string }> = {
  job: {
    label: 'JOBS',
    description: 'CS-focused internships and new-grad roles only.',
    badge: 'JOB',
  },
  program: {
    label: 'PROGRAMS',
    description: 'Fellowships, associate programs, and rotational tracks.',
    badge: 'PROGRAM',
  },
  event: {
    label: 'EVENTS',
    description: 'Summits, recruiting sessions, and campus events.',
    badge: 'EVENT',
  },
};

export default async function Home() {
  let jobs: Job[] = [];

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
  })).filter((group) => group.jobs.length > 0);

  return (
    <section>
      <h1 className="page-title">ACTIVE_OPPORTUNITIES</h1>
      <p className="page-desc">
        Semantic categorization of live company postings into jobs, programs, and events. Job listings are limited to CS-focused internships and new-grad roles, ordered by earliest first seen.
      </p>

      {groups.length === 0 ? (
        <div className="empty-state">
          [ SYSTEM: NO CATEGORIZED LISTINGS AVAILABLE IN CURRENT FEED ]
        </div>
      ) : (
        groups.map(({ category, jobs: categoryJobs }) => (
          <section className="category-section" key={category}>
            <div className="category-header">
              <div>
                <h2 className="category-title">
                  {CATEGORY_COPY[category].label} <span className="category-count">[{categoryJobs.length}]</span>
                </h2>
                <p className="category-desc">{CATEGORY_COPY[category].description}</p>
              </div>
            </div>

            <div className="data-grid">
              {categoryJobs.map((job, idx) => {
                const firstSeen = new Date(job.firstSeenAt ?? job.dateScraped);
                const formattedDate = !isNaN(firstSeen.getTime())
                  ? firstSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'Unknown Date';

                return (
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className="data-row" key={`${job.url}-${idx}`}>
                    <div className="company-name">{job.company.toUpperCase()}</div>
                    <div className="job-title">
                      {job.title}
                      {job.jobTrack ? (
                        <span className="row-meta">{job.jobTrack === 'new-grad' ? 'NEW GRAD' : 'INTERNSHIP'}</span>
                      ) : null}
                    </div>
                    <div>
                      <span className={`status-badge badge-${category}`}>{CATEGORY_COPY[category].badge}</span>
                    </div>
                    <div className="date">[FIRST SEEN {formattedDate}]</div>
                  </a>
                );
              })}
            </div>
          </section>
        ))
      )}
    </section>
  );
}
