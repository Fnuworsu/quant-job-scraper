import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-static';

interface Job {
  company: string;
  title: string;
  url: string;
  dateScraped: string;
}

function hasListingId(url: URL) {
  for (const [key, value] of url.searchParams.entries()) {
    if (
      /(gh_jid|job|jobid|job_id|req|reqid|req_id|requisition|posting|opening|position|id)$/i.test(
        key,
      )
    ) {
      return true;
    }

    if (
      /^\d{4,}$/.test(value) ||
      /^[a-f0-9]{8,}$/i.test(value) ||
      /^[a-f0-9]{8,}-[a-f0-9-]{8,}$/i.test(value)
    ) {
      return true;
    }
  }

  return false;
}

function isRelevantListingTitle(rawTitle: string) {
  const title = rawTitle.replace(/\s+/g, ' ').trim();
  if (!title || title.length < 8 || title.length > 160) {
    return false;
  }

  if (
    [
      /^apply for internships$/i,
      /^from\b/i,
      /^internships,/i,
      /^our\b/i,
      /^programs?\s*&\s*events$/i,
      /^internship opportunities$/i,
      /frequently asked questions/i,
      /^what do\b/i,
      /^students?\s*(?:&|and)\s*graduates?$/i,
      /^summer internships?$/i,
      /^fun events?$/i,
      /international footprint/i,
      /\bq&a\b/i,
      /\?$/,
    ].some((pattern) => pattern.test(title))
  ) {
    return false;
  }

  return [
    /\bcampus\b/i,
    /\bfellowships?\b/i,
    /\bgraduates?\b/i,
    /\binsight\b/i,
    /\bintern(?:ship)?s?\b/i,
    /\bnew grad\b/i,
    /\bprograms?\b/i,
    /\bstudents?\b/i,
    /\bsummit\b/i,
  ].some((pattern) => pattern.test(title));
}

function isDirectListingUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./i, '');
    const pathname = url.pathname.endsWith('/') && url.pathname !== '/'
      ? url.pathname.slice(0, -1)
      : url.pathname;

    if (/(?:builtin|canva)\.com$/i.test(hostname)) {
      return false;
    }

    if (
      /(?:ashbyhq|greenhouse|icims|jobvite|lever|myworkdayjobs|smartrecruiters|workdayjobs)\.com$/i.test(
        hostname,
      )
    ) {
      return true;
    }

    if (hasListingId(url)) {
      return true;
    }

    if (
      /\/(?:details?|job(?:s|search)?|openings?|positions?|posting|requisitions?|search\/jobdetails|vacanc(?:y|ies))\//i.test(
        pathname,
      )
    ) {
      return true;
    }

    if (
      /\/(?:careers?|open-roles?|career-opportunities|join|jobs?)$/i.test(pathname) ||
      pathname === '/'
    ) {
      return false;
    }

    return pathname.split('/').filter(Boolean).length >= 3;
  } catch {
    return false;
  }
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

  const visibleJobs = jobs.filter(
    (job) => isDirectListingUrl(job.url) && isRelevantListingTitle(job.title),
  );
  const suppressedCount = jobs.length - visibleJobs.length;

  return (
    <section>
      <h1 className="page-title">ACTIVE_OPPORTUNITIES</h1>
      <p className="page-desc">
        Real-time aggregation of quantitative internships, early-career programs, and events.
      </p>

      {visibleJobs.length === 0 ? (
        <div className="empty-state">
          [ SYSTEM: NO DIRECT LISTINGS AVAILABLE IN CURRENT FEED ]
        </div>
      ) : (
        <div className="data-grid">
          {visibleJobs.map((job, idx) => {
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

      {suppressedCount > 0 ? (
        <p className="page-desc" style={{ marginTop: '1.5rem' }}>
          Suppressed {suppressedCount} generic career-page link{suppressedCount === 1 ? '' : 's'} until the scraper resolves them to direct listings.
        </p>
      ) : null}
    </section>
  );
}
