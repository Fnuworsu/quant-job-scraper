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
    isLikelyDirectListingUrl('https://www.canva.com/design/DAGpbGqu4iI/example/view'),
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
    [],
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
        dateScraped: '2025-01-01T12:00:00.000Z',
      },
    ],
  );

  assert.deepEqual(mergedJobs, [
    {
      company: 'Jane Street',
      title: 'Trading Intern',
      url: 'https://boards.greenhouse.io/janestreet/jobs/123456',
      dateScraped: '2025-01-01T12:00:00.000Z',
    },
  ]);
});
