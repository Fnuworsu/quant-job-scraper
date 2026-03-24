import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

interface Job {
  company: string;
  title: string;
  url: string;
  dateScraped: string;
}

export default async function Home() {
  let jobs: Job[] = [];

  try {
    const dataPath = path.join(process.cwd(), 'public', 'data.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    jobs = JSON.parse(fileContents);
  } catch (error) {
    console.warn("No data.json found or error parsing.", error);
  }

  return (
    <section>
      <h1 className="page-title">ACTIVE_INTERNSHIPS</h1>
      <p className="page-desc">
        Real-time aggregation of quantitative trading, research, and engineering roles.
      </p>

      {jobs.length === 0 ? (
        <div className="empty-state">
          [ SYSTEM: NO ACTIVE ROLES FOUND IN DATABASE ]
        </div>
      ) : (
        <div className="data-grid">
          {jobs.map((job, idx) => {
            const date = new Date(job.dateScraped);
            const formattedDate = !isNaN(date.getTime()) 
              ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Unknown Date';

            return (
              <a href={job.url} target="_blank" rel="noopener noreferrer" className="data-row" key={idx}>
                <div className="company-name">{job.company.toUpperCase()}</div>
                <div className="job-title">{job.title}</div>
                <div><span className="status-badge">OPEN</span></div>
                <div className="date">[{formattedDate}]</div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
