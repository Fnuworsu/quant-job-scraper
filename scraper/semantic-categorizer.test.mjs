import test from 'node:test';
import assert from 'node:assert/strict';

import { heuristicCategorizeListing } from './semantic-categorizer.mjs';

test('heuristics recognize cs internships', () => {
  const result = heuristicCategorizeListing({
    company: 'Akuna Capital',
    title: 'Software Engineer Intern - Python, Summer 2026',
    contextText: '',
  });

  assert.equal(result.category, 'internship');
  assert.equal(result.isRelevantCsRole, true);
});

test('heuristics recognize new grad technical roles', () => {
  const result = heuristicCategorizeListing({
    company: 'Jane Street',
    title: 'New Grad Software Engineer',
    contextText: '',
  });

  assert.equal(result.category, 'new-grad');
  assert.equal(result.isRelevantCsRole, true);
});

test('heuristics fold events into programs', () => {
  const result = heuristicCategorizeListing({
    company: 'Citadel',
    title: 'PhD Summit',
    contextText: '',
  });

  assert.equal(result.category, 'program');
});

test('heuristics exclude non-cs early-career roles', () => {
  const result = heuristicCategorizeListing({
    company: 'Akuna Capital',
    title: 'Campus Recruiter Internship',
    contextText: '',
  });

  assert.equal(result.category, 'other');
  assert.equal(result.isRelevantCsRole, false);
});

test('heuristics do not treat staff program roles as student programs', () => {
  const result = heuristicCategorizeListing({
    company: 'Bridgewater Associates',
    title: 'Program Manager',
    contextText: '',
  });

  assert.equal(result.category, 'other');
});

test('heuristics exclude finance internships from the cs bucket', () => {
  const result = heuristicCategorizeListing({
    company: 'Group One Trading',
    title: 'Finance Intern',
    contextText: '',
  });

  assert.equal(result.category, 'other');
  assert.equal(result.isRelevantCsRole, false);
});
