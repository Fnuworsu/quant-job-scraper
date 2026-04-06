import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildJobsFromCandidates,
  isDirectJobUrl,
  isLikelyDirectListingUrl,
  mergeJobs,
} from './job-utils.mjs';

test('treats career hubs as non-direct links', () => {
  assert.equal(isLikelyDirectListingUrl('https://www.citadel.com/careers/'), false);
  assert.equal(
    isLikelyDirectListingUrl('https://www.janestreet.com/join-jane-street/open-roles/?type=internship'),
    false,
  );
  assert.equal(
    isLikelyDirectListingUrl('https://jobs.lever.co/belvederetrading?commitment=Intern'),
    false,
  );
  assert.equal(
    isLikelyDirectListingUrl('https://www.canva.com/design/DAGpbGqu4iI/example/view'),
    false,
  );
  assert.equal(
    isLikelyDirectListingUrl('https://www.grahamcapital.com/research/example.pdf'),
    false,
  );
});

test('recognizes concrete listing URLs', () => {
  assert.equal(
    isDirectJobUrl(
      'https://www.citadel.com/careers/details/12345/software-engineering-intern-trading-systems',
      'https://www.citadel.com/careers/',
    ),
    true,
  );

  assert.equal(
    isDirectJobUrl(
      'https://boards.greenhouse.io/example/jobs/987654',
      'https://example.com/careers',
    ),
    true,
  );
});

test('prefers a direct listing URL over the generic careers landing page', () => {
  const jobs = buildJobsFromCandidates(
    {
      name: 'Citadel',
      url: 'https://www.citadel.com/careers/',
    },
    [
      {
        title: 'Software Engineering Intern - Trading Systems',
        href: 'https://www.citadel.com/careers/',
        linkText: 'Careers',
        linkOptions: [
          {
            href: 'https://www.citadel.com/careers/',
            text: 'Careers',
          },
          {
            href: 'https://www.citadel.com/careers/details/12345/software-engineering-intern-trading-systems',
            text: 'Apply',
          },
        ],
      },
    ],
    '2026-03-27T12:00:00.000Z',
  );

  assert.equal(jobs.length, 1);
  assert.equal(
    jobs[0].url,
    'https://www.citadel.com/careers/details/12345/software-engineering-intern-trading-systems',
  );
});

test('drops article-style campus content even when the URL is direct', () => {
  const jobs = buildJobsFromCandidates(
    {
      name: 'Optiver',
      url: 'https://optiver.com/working-at-optiver/career-opportunities/',
    },
    [
      {
        title: 'Optiver EU campus recruiting Q&A',
        href: 'https://optiver.com/working-at-optiver/career-hub/optiver-eu-campus-recruiting-qa',
        linkText: 'Optiver EU campus recruiting Q&A',
        linkOptions: [
          {
            href: 'https://optiver.com/working-at-optiver/career-hub/optiver-eu-campus-recruiting-qa',
            text: 'Optiver EU campus recruiting Q&A',
          },
        ],
      },
    ],
  );

  assert.equal(jobs.length, 0);
});

test('does not treat programmer titles as early-career programs', () => {
  const jobs = buildJobsFromCandidates(
    {
      name: 'Renaissance Technologies',
      url: 'https://www.rentec.com/Careers.action',
    },
    [
      {
        title: 'Data Programmer',
        href: 'https://www.rentec.com/Careers.action?jobs=true&selectedPosition=dataProgrammer',
        linkText: 'Data Programmer',
        linkOptions: [
          {
            href: 'https://www.rentec.com/Careers.action?jobs=true&selectedPosition=dataProgrammer',
            text: 'Data Programmer',
          },
        ],
      },
    ],
  );

  assert.equal(jobs.length, 0);
});

test('drops legacy placeholder rows during merge while preserving direct listings', () => {
  const mergedJobs = mergeJobs(
    [
      {
        company: 'Jane Street',
        title: 'Trading Intern',
        url: 'https://boards.greenhouse.io/janestreet/jobs/123456',
        category: 'internship',
        firstSeenAt: '2025-01-02T12:00:00.000Z',
        dateScraped: '2025-01-02T12:00:00.000Z',
      },
    ],
    [
      {
        company: 'Hudson River Trading',
        title: 'Algorithm Developer Intern',
        url: 'https://www.hudsonrivertrading.com/career-opportunities/',
        dateScraped: '2025-01-01T12:00:00.000Z',
      },
      {
        company: 'Jane Street',
        title: 'Trading Intern',
        url: 'https://boards.greenhouse.io/janestreet/jobs/123456',
        category: 'internship',
        firstSeenAt: '2025-01-01T12:00:00.000Z',
        dateScraped: '2025-01-01T12:00:00.000Z',
      },
    ],
  );

  assert.deepEqual(mergedJobs, [
    {
      company: 'Jane Street',
      title: 'Trading Intern',
      url: 'https://boards.greenhouse.io/janestreet/jobs/123456',
      category: 'internship',
      jobTrack: null,
      categoryConfidence: null,
      classificationModel: null,
      firstSeenAt: '2025-01-01T12:00:00.000Z',
      lastSeenAt: '2025-01-02T12:00:00.000Z',
      dateScraped: '2025-01-02T12:00:00.000Z',
    },
  ]);
});

test('merge keeps oldest firstSeenAt so listings sort oldest first', () => {
  const mergedJobs = mergeJobs(
    [
      {
        company: 'Teza Technologies',
        title: 'Quant Internship',
        url: 'https://jobs.ashbyhq.com/teza/123',
        category: 'internship',
        firstSeenAt: '2025-01-03T12:00:00.000Z',
        dateScraped: '2025-01-04T12:00:00.000Z',
      },
      {
        company: 'Citadel',
        title: 'GQS PhD Fellowship',
        url: 'https://www.citadel.com/careers/programs-and-events/gqs-phd-fellowship',
        category: 'program',
        firstSeenAt: '2025-01-01T12:00:00.000Z',
        dateScraped: '2025-01-04T12:00:00.000Z',
      },
    ],
  );

  assert.deepEqual(mergedJobs.map((job) => job.title), [
    'GQS PhD Fellowship',
    'Quant Internship',
  ]);
});

test('merge updates reposted listings when the URL changes but the title stays the same', () => {
  const mergedJobs = mergeJobs(
    [
      {
        company: 'Akuna Capital',
        title: 'Software Engineer Intern - Python, Summer 2026',
        url: 'https://akunacapital.com/careers/job/999/software-engineer-intern-python-summer-2026?gh_jid=999',
        category: 'internship',
        firstSeenAt: '2025-01-08T12:00:00.000Z',
        dateScraped: '2025-01-08T12:00:00.000Z',
      },
    ],
    [
      {
        company: 'Akuna Capital',
        title: 'Software Engineer Intern - Python, Summer 2026',
        url: 'https://akunacapital.com/careers/job/111/software-engineer-intern-python-summer-2026?gh_jid=111',
        category: 'internship',
        firstSeenAt: '2025-01-01T12:00:00.000Z',
        lastSeenAt: '2025-01-02T12:00:00.000Z',
        dateScraped: '2025-01-02T12:00:00.000Z',
      },
    ],
  );

  assert.equal(mergedJobs.length, 1);
  assert.equal(
    mergedJobs[0].url,
    'https://akunacapital.com/careers/job/999/software-engineer-intern-python-summer-2026?gh_jid=999',
  );
  assert.equal(mergedJobs[0].firstSeenAt, '2025-01-01T12:00:00.000Z');
  assert.equal(mergedJobs[0].lastSeenAt, '2025-01-08T12:00:00.000Z');
});

test('merge expires listings that have not been seen for more than two weeks', () => {
  const mergedJobs = mergeJobs(
    [
      {
        company: 'Citadel',
        title: 'Launch Program',
        url: 'https://www.citadel.com/careers/programs-and-events/launch-program',
        category: 'program',
        firstSeenAt: '2025-02-20T12:00:00.000Z',
        dateScraped: '2025-02-20T12:00:00.000Z',
      },
    ],
    [
      {
        company: 'Old Mission Capital',
        title: 'Trading Internship',
        url: 'https://boards.greenhouse.io/oldmission/jobs/123',
        category: 'internship',
        firstSeenAt: '2025-01-01T12:00:00.000Z',
        lastSeenAt: '2025-02-01T12:00:00.000Z',
        dateScraped: '2025-02-01T12:00:00.000Z',
      },
    ],
  );

  assert.deepEqual(mergedJobs.map((job) => job.company), ['Citadel']);
});

test('merge removes unseen listings immediately for companies that scraped successfully', () => {
  const mergedJobs = mergeJobs(
    [
      {
        company: 'Akuna Capital',
        title: 'Software Engineer Intern - Python, Summer 2026',
        url: 'https://akunacapital.com/careers/job/999/software-engineer-intern-python-summer-2026?gh_jid=999',
        category: 'internship',
        firstSeenAt: '2025-01-08T12:00:00.000Z',
        dateScraped: '2025-01-08T12:00:00.000Z',
      },
    ],
    [
      {
        company: 'Akuna Capital',
        title: 'Campus Recruiter Chicago',
        url: 'https://akunacapital.com/careers/job/7738888/campus-recruiter?gh_jid=7738888',
        category: 'program',
        firstSeenAt: '2025-01-01T12:00:00.000Z',
        lastSeenAt: '2025-01-07T12:00:00.000Z',
        dateScraped: '2025-01-07T12:00:00.000Z',
      },
    ],
    1000,
    {
      successfulCompanies: new Set(['Akuna Capital']),
    },
  );

  assert.deepEqual(mergedJobs.map((job) => job.title), [
    'Software Engineer Intern - Python, Summer 2026',
  ]);
});

test('buildJobsFromCandidates dedupes repeated cards that point to the same URL', () => {
  const jobs = buildJobsFromCandidates(
    {
      name: 'Akuna Capital',
      url: 'https://akunacapital.com/careers',
    },
    [
      {
        title: 'Software Engineer Intern - Python, Summer 2026',
        href: 'https://akunacapital.com/careers/job/7055471/software-engineer-intern-python-summer-2026?gh_jid=7055471',
        linkText: 'Software Engineer Intern - Python, Summer 2026',
        linkOptions: [
          {
            href: 'https://akunacapital.com/careers/job/7055471/software-engineer-intern-python-summer-2026?gh_jid=7055471',
            text: 'Software Engineer Intern - Python, Summer 2026',
          },
        ],
      },
      {
        title: 'Software Engineer Intern - Python, Summer 2026 Chicago',
        href: 'https://akunacapital.com/careers/job/7055471/software-engineer-intern-python-summer-2026?gh_jid=7055471',
        linkText: 'Software Engineer Intern - Python, Summer 2026 Chicago',
        linkOptions: [
          {
            href: 'https://akunacapital.com/careers/job/7055471/software-engineer-intern-python-summer-2026?gh_jid=7055471',
            text: 'Software Engineer Intern - Python, Summer 2026 Chicago',
          },
        ],
      },
    ],
  );

  assert.equal(jobs.length, 1);
  assert.equal(jobs[0].title, 'Software Engineer Intern - Python, Summer 2026 Chicago');
});
