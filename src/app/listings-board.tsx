'use client';

import { useState } from 'react';

export interface Listing {
  company: string;
  title: string;
  url: string;
  category: 'internship' | 'new-grad' | 'program';
  firstSeenAt?: string;
  dateScraped: string;
}

interface Group {
  category: Listing['category'];
  jobs: Listing[];
}

const CATEGORY_COPY: Record<Listing['category'], { label: string; description: string; badge: string }> = {
  internship: {
    label: 'Internships',
    description: 'Technical internships for software, data, and quant-focused students.',
    badge: 'Internship',
  },
  'new-grad': {
    label: 'New Grad',
    description: 'Early-career full-time roles for new grads and recent graduates.',
    badge: 'New Grad',
  },
  program: {
    label: 'Programs',
    description: 'Summits, fellowships, insight programs, and other student opportunities.',
    badge: 'Program',
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

  return `Posted ${date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  })}`;
}

export default function ListingsBoard({ groups }: { groups: Group[] }) {
  const [activeTab, setActiveTab] = useState<Listing['category']>(groups[0]?.category ?? 'internship');
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
      <section className="panel-card">
        <div className="panel-head">
          <div>
            <p className="panel-kicker">Browse the board</p>
            <h2 className="panel-title">Open postings, without the clutter</h2>
            <p className="panel-desc">
              Switch between internships, new grad roles, and programs. Each row links straight to the posting page.
            </p>
          </div>
        </div>

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

        <div className="board-subhead">
          <div>
            <p className="board-subhead-kicker">{CATEGORY_COPY[activeGroup.category].badge}</p>
            <p className="board-subhead-copy">{CATEGORY_COPY[activeGroup.category].description}</p>
          </div>
          <span className="board-subhead-count">{activeGroup.jobs.length} live listings</span>
        </div>

        {activeGroup.jobs.length === 0 ? (
          <div className="empty-state">
            No listings in this tab yet.
          </div>
        ) : (
          <div className="listing-table" role="list">
            {activeGroup.jobs.map((job, index) => (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="listing-row"
                key={`${job.url}-${index}`}
                role="listitem"
              >
                <div className="listing-main">
                  <p className="listing-company">{job.company}</p>
                  <h3 className="listing-title">{job.title}</h3>
                </div>

                <div className="listing-side">
                  <span className={`listing-badge listing-badge-${job.category}`}>
                    {CATEGORY_COPY[job.category].badge}
                  </span>
                  <span className="posted-date">{formatPostedDate(job.firstSeenAt ?? job.dateScraped)}</span>
                  <span className="listing-link">Open posting</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
