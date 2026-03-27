import test from 'node:test';
import assert from 'node:assert/strict';

import { heuristicCategorizeListing } from './semantic-categorizer.mjs';

test('heuristics recognize cs internship jobs', () => {
  const result = heuristicCategorizeListing({
    company: 'Akuna Capital',
    title: 'Software Engineer Intern - Python, Summer 2026',
    contextText: '',
  });

  assert.equal(result.category, 'job');
  assert.equal(result.jobTrack, 'internship');
  assert.equal(result.isRelevantCsJob, true);
});

test('heuristics recognize programs', () => {
  const result = heuristicCategorizeListing({
    company: 'Citadel',
    title: 'Citadel Associate Program',
    contextText: '',
  });

  assert.equal(result.category, 'program');
});

test('heuristics recognize events', () => {
  const result = heuristicCategorizeListing({
    company: 'Citadel',
    title: 'PhD Summit',
    contextText: '',
  });

  assert.equal(result.category, 'event');
});

test('heuristics exclude non-cs campus roles from job focus', () => {
  const result = heuristicCategorizeListing({
    company: 'Akuna Capital',
    title: 'Campus Recruiter',
    contextText: '',
  });

  assert.equal(result.category, 'job');
  assert.equal(result.isRelevantCsJob, false);
});
