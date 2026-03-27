'use client';

import { useState } from 'react';

export interface Listing {
  company: string;
  title: string;
  url: string;
  category: 'job' | 'program' | 'event';
  jobTrack: 'internship' | 'new-grad' | null;
  firstSeenAt?: string;
  dateScraped: string;
}

interface Group {
  category: Listing['category'];
  jobs: Listing[];
}

const CATEGORY_COPY: Record<Listing['category'], { label: string; description: string; badge: string }> = {
  job: {
    label: 'Jobs',
    description: 'Internships and new grad roles for students and early-career engineers.',
    badge: 'Job',
  },
  program: {
    label: 'Programs',
    description: 'Fellowships, rotational programs, and early-career tracks.',
    badge: 'Program',
  },
  event: {
    label: 'Events',
    description: 'Recruiting events, summits, and campus sessions worth tracking.',
    badge: 'Event',
  },
};

function formatPostedDate(rawDate?: string) {
  if (!rawDate) {
    return 'Posted recently';
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return 'Posted recently';
  }

  const month = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  const remainder = day % 10;
  const suffix = day >= 11 && day <= 13
    ? 'th'
    : remainder === 1
      ? 'st'
      : remainder === 2
        ? 'nd'
        : remainder === 3
          ? 'rd'
          : 'th';

  return `Posted ${month} ${day}${suffix}`;
}

export default function ListingsBoard({ groups }: { groups: Group[] }) {
  const [activeTab, setActiveTab] = useState<Listing['category']>(groups[0]?.category ?? 'job');
  const activeGroup = groups.find((group) => group.category === activeTab) ?? groups[0];

  if (!activeGroup) {
    return (
      <div className="empty-state">
        No listings yet.
      </div>
    );
  }

  return (
    <div className="board-shell">
      <div className="tab-bar" role="tablist" aria-label="Listing categories">
        {groups.map((group) => {
          const isActive = group.category === activeTab;

          return (
            <button
              type="button"
              key={group.category}
              className={`tab-chip ${isActive ? 'tab-chip-active' : ''}`}
              onClick={() => setActiveTab(group.category)}
              role="tab"
              aria-selected={isActive}
            >
              <span>{CATEGORY_COPY[group.category].label}</span>
              <span className="tab-chip-count">{group.jobs.length}</span>
            </button>
          );
        })}
      </div>

      <section className="panel-card">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">{CATEGORY_COPY[activeGroup.category].badge}</p>
            <h2 className="panel-title">{CATEGORY_COPY[activeGroup.category].label}</h2>
            <p className="panel-desc">{CATEGORY_COPY[activeGroup.category].description}</p>
          </div>
        </div>

        {activeGroup.jobs.length === 0 ? (
          <div className="empty-state">
            No listings in this tab yet.
          </div>
        ) : (
          <div className="listing-grid">
            {activeGroup.jobs.map((job, idx) => (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="listing-card"
                key={`${job.url}-${idx}`}
              >
                <div className="listing-card-top">
                  <p className="listing-company">{job.company}</p>
                  <span className={`listing-badge listing-badge-${job.category}`}>
                    {CATEGORY_COPY[job.category].badge}
                  </span>
                </div>

                <h3 className="listing-title">
                  {job.title}
                </h3>

                <div className="listing-meta">
                  {job.jobTrack ? (
                    <span className="track-pill">
                      {job.jobTrack === 'new-grad' ? 'New Grad' : 'Internship'}
                    </span>
                  ) : <span className="track-pill track-pill-muted">Open now</span>}
                  <span className="posted-date">{formatPostedDate(job.firstSeenAt ?? job.dateScraped)}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
