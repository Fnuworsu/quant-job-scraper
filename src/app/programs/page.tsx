import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

interface Program {
  company: string;
  title: string;
  url: string;
  dateScraped: string;
}

export default async function Programs() {
  let programs: Program[] = [];

  try {
    const dataPath = path.join(process.cwd(), 'public', 'programs.json');
    const fileContents = await fs.readFile(dataPath, 'utf8');
    programs = JSON.parse(fileContents);
  } catch (error) {
    console.warn("No programs.json found or error parsing.");
  }

  return (
    <section>
      <h1 className="page-title">PROGRAMS_EVENTS</h1>
      <p className="page-desc">
        Discovery and insight programs, hackathons, and trading competitions.
      </p>

      {programs.length === 0 ? (
        <div className="empty-state">
          [ SYSTEM: WAITING FOR INCOMING EVENT DATA ]<br />
          <span style={{ fontSize: '0.8rem', marginTop: '1rem', display: 'block' }}>
            Data source currently unpopulated. Check back later.
          </span>
        </div>
      ) : (
        <div className="data-grid">
          {programs.map((prog, idx) => {
            const date = new Date(prog.dateScraped);
            const formattedDate = !isNaN(date.getTime()) 
              ? date.toLocaleDateString()
              : 'Unknown Date';

            return (
              <a href={prog.url} target="_blank" rel="noopener noreferrer" className="data-row" key={idx}>
                <div className="company-name">{prog.company.toUpperCase()}</div>
                <div className="job-title">{prog.title}</div>
                <div><span className="status-badge">EVENT</span></div>
                <div className="date">[{formattedDate}]</div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
