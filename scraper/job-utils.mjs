const NOISE_WORDS = [
  'about',
  'careers',
  'career opportunities',
  'contact',
  'cookie',
  'faq',
  'home',
  'join us',
  'learn more',
  'log in',
  'login',
  'open roles',
  'privacy',
  'read more',
  'students',
  'students and graduates',
  'team',
  'terms',
];

const TARGET_KEYWORD_PATTERNS = [
  /\bcampus\b/i,
  /\bfellowships?\b/i,
  /\bgraduates?\b/i,
  /\binsight\b/i,
  /\bintern(?:ship)?s?\b/i,
  /\bnew grad\b/i,
  /\bprograms?\b/i,
  /\bstudents?\b/i,
  /\bsummit\b/i,
];

const GENERIC_LINK_TEXT = [
  'apply',
  'apply now',
  'careers',
  'details',
  'explore roles',
  'learn more',
  'open roles',
  'read more',
  'see more',
  'view details',
  'view job',
  'view role',
];

const NEGATIVE_TITLE_PATTERNS = [
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
];

const ATS_HOST_PATTERNS = [
  /ashbyhq\.com$/i,
  /boards\.greenhouse\.io$/i,
  /greenhouse\.io$/i,
  /icims\.com$/i,
  /jobvite\.com$/i,
  /jobs\.lever\.co$/i,
  /lever\.co$/i,
  /myworkdayjobs\.com$/i,
  /smartrecruiters\.com$/i,
  /workdayjobs\.com$/i,
];

const NON_LISTING_HOST_PATTERNS = [
  /builtin\.com$/i,
  /canva\.com$/i,
];

const JOB_PATH_PATTERNS = [
  /\/details?\//i,
  /\/job(?:s|search)?\//i,
  /\/openings?\//i,
  /\/positions?\//i,
  /\/posting\//i,
  /\/requisitions?\//i,
  /\/search\/jobdetails\//i,
  /\/vacanc(?:y|ies)\//i,
];

const STOP_WORDS = new Set([
  'and',
  'for',
  'the',
  'with',
  'your',
  'role',
  'team',
  'our',
]);

const ALLOWED_CATEGORIES = new Set(['internship', 'new-grad', 'program']);
const STALE_RETENTION_MS = 1000 * 60 * 60 * 24 * 14;

export function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizePathname(pathname = '/') {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function normalizeUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.hash = '';
    url.pathname = normalizePathname(url.pathname);
    return url.toString();
  } catch {
    return null;
  }
}

function parseUrl(rawUrl) {
  const normalized = normalizeUrl(rawUrl);
  return normalized ? new URL(normalized) : null;
}

function hasIdentifierParams(url) {
  for (const [key, value] of url.searchParams.entries()) {
    const lowerKey = key.toLowerCase();
    if (
      /(gh_jid|job|jobid|job_id|req|reqid|req_id|requisition|posting|opening|position|id)$/.test(lowerKey)
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

function tokenize(text) {
  return cleanText(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function hasMeaningfulOverlap(left, right) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  let overlap = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  }

  return overlap >= 2;
}

export function isRelevantTitle(title) {
  const cleanedTitle = cleanText(title);
  if (!cleanedTitle || cleanedTitle.length < 8 || cleanedTitle.length > 160) {
    return false;
  }

  const lowerTitle = cleanedTitle.toLowerCase();

  if (NOISE_WORDS.some((word) => lowerTitle === word || lowerTitle.startsWith(`${word} |`))) {
    return false;
  }

  if (NEGATIVE_TITLE_PATTERNS.some((pattern) => pattern.test(cleanedTitle))) {
    return false;
  }

  if (lowerTitle.includes('learn more') || lowerTitle.includes('read more')) {
    return false;
  }

  if (tokenize(cleanedTitle).length < 2) {
    return false;
  }

  return TARGET_KEYWORD_PATTERNS.some((pattern) => pattern.test(cleanedTitle));
}

export function isLikelyDirectListingUrl(rawUrl) {
  const parsedUrl = parseUrl(rawUrl);
  if (!parsedUrl || !/^https?:$/.test(parsedUrl.protocol)) {
    return false;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./i, '');
  const pathname = normalizePathname(parsedUrl.pathname);
  const pathSegments = pathname.split('/').filter(Boolean);

  if (NON_LISTING_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return false;
  }

  if (/\.(pdf|doc|docx|ppt|pptx)$/i.test(pathname)) {
    return false;
  }

  if (ATS_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return hasIdentifierParams(parsedUrl)
      || JOB_PATH_PATTERNS.some((regex) => regex.test(pathname))
      || pathSegments.length >= 2;
  }

  if (hasIdentifierParams(parsedUrl)) {
    return true;
  }

  if (JOB_PATH_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return true;
  }

  if (
    /\/(?:careers?|open-roles?|career-opportunities|join|jobs?)$/i.test(pathname) ||
    pathname === '/'
  ) {
    return false;
  }

  return pathSegments.length >= 3;
}

export function isDirectJobUrl(rawUrl, companyUrl) {
  const candidateUrl = parseUrl(rawUrl);
  const companyCareerUrl = parseUrl(companyUrl);
  if (!candidateUrl || !companyCareerUrl) {
    return false;
  }

  if (!isLikelyDirectListingUrl(candidateUrl.toString())) {
    return false;
  }

  const candidateHost = candidateUrl.hostname.replace(/^www\./i, '');
  const companyHost = companyCareerUrl.hostname.replace(/^www\./i, '');
  const candidatePath = normalizePathname(candidateUrl.pathname);
  const companyPath = normalizePathname(companyCareerUrl.pathname);

  if (
    candidateHost === companyHost &&
    candidatePath === companyPath &&
    !hasIdentifierParams(candidateUrl)
  ) {
    return false;
  }

  return true;
}

function scoreLink(title, option, companyUrl) {
  const normalizedUrl = normalizeUrl(option?.href);
  if (!normalizedUrl) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = isDirectJobUrl(normalizedUrl, companyUrl) ? 8 : -8;
  const optionText = cleanText(option?.text ?? '').toLowerCase();
  const lowerTitle = title.toLowerCase();

  if (optionText) {
    if (optionText === lowerTitle) {
      score += 5;
    } else if (optionText.includes(lowerTitle) || lowerTitle.includes(optionText)) {
      score += 3;
    } else if (hasMeaningfulOverlap(optionText, lowerTitle)) {
      score += 2;
    }

    if (GENERIC_LINK_TEXT.includes(optionText)) {
      score -= 2;
    }
  } else {
    score += 1;
  }

  return score;
}

function pickBestUrl(candidate, companyUrl) {
  const linkOptions = [
    { href: candidate.href, text: candidate.linkText },
    ...(candidate.linkOptions ?? []),
  ];

  const dedupedOptions = [];
  const seenUrls = new Set();

  for (const option of linkOptions) {
    const normalizedUrl = normalizeUrl(option?.href);
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    dedupedOptions.push({ href: normalizedUrl, text: cleanText(option?.text ?? '') });
  }

  let bestUrl = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const option of dedupedOptions) {
    const score = scoreLink(candidate.title, option, companyUrl);
    if (score > bestScore) {
      bestScore = score;
      bestUrl = option.href;
    }
  }

  return bestScore > 0 ? bestUrl : null;
}

function titleKey(job) {
  return `${job.company.toLowerCase()}::${cleanText(job.title).toLowerCase()}::${job.category ?? 'uncategorized'}`;
}

function jobKey(job) {
  return `${job.company.toLowerCase()}::${normalizeUrl(job.url) ?? ''}`;
}

function latestTimestamp(...values) {
  return values.reduce((latest, current) => {
    if (!current) {
      return latest;
    }

    if (!latest || latest.localeCompare(current) < 0) {
      return current;
    }

    return latest;
  }, null);
}

function earliestTimestamp(...values) {
  return values.reduce((earliest, current) => {
    if (!current) {
      return earliest;
    }

    if (!earliest || earliest.localeCompare(current) > 0) {
      return current;
    }

    return earliest;
  }, null);
}

function preferTitle(currentTitle, nextTitle) {
  const current = cleanText(currentTitle);
  const next = cleanText(nextTitle);

  if (!current) {
    return next;
  }

  if (!next) {
    return current;
  }

  if (next.length >= current.length + 6) {
    return next;
  }

  if (current.length >= next.length + 6) {
    return current;
  }

  return next;
}

function mergeListingVersions(previous, current) {
  if (!previous) {
    return current;
  }

  return {
    ...previous,
    ...current,
    title: preferTitle(previous.title, current.title),
    category: current.category ?? previous.category ?? null,
    jobTrack: current.jobTrack ?? previous.jobTrack ?? null,
    categoryConfidence: current.categoryConfidence ?? previous.categoryConfidence ?? null,
    classificationModel: current.classificationModel ?? previous.classificationModel ?? null,
    firstSeenAt: earliestTimestamp(
      previous.firstSeenAt,
      previous.dateScraped,
      current.firstSeenAt,
      current.dateScraped,
    ) ?? new Date().toISOString(),
    lastSeenAt: latestTimestamp(
      previous.lastSeenAt,
      previous.dateScraped,
      current.lastSeenAt,
      current.dateScraped,
    ) ?? new Date().toISOString(),
    dateScraped: latestTimestamp(previous.dateScraped, current.dateScraped) ?? new Date().toISOString(),
  };
}

function isStale(job, latestScrapeTimestamp) {
  if (!latestScrapeTimestamp) {
    return false;
  }

  const lastSeen = Date.parse(job.lastSeenAt ?? job.dateScraped ?? '');
  const latestScrape = Date.parse(latestScrapeTimestamp);

  if (Number.isNaN(lastSeen) || Number.isNaN(latestScrape)) {
    return false;
  }

  return latestScrape - lastSeen > STALE_RETENTION_MS;
}

function normalizeJob(job) {
  const title = cleanText(job?.title ?? '');
  const url = normalizeUrl(job?.url ?? '');

  if (!title || !url || !isLikelyDirectListingUrl(url)) {
    return null;
  }

  if (job.category !== undefined && job.category !== null && !ALLOWED_CATEGORIES.has(job.category)) {
    return null;
  }

  if (job.category === null) {
    return null;
  }

  return {
    company: cleanText(job.company ?? ''),
    title,
    url,
    category: job.category ?? null,
    jobTrack: job.jobTrack ?? null,
    categoryConfidence: job.categoryConfidence ?? null,
    classificationModel: job.classificationModel ?? null,
    firstSeenAt: job.firstSeenAt ?? job.lastSeenAt ?? job.dateScraped ?? new Date().toISOString(),
    lastSeenAt: job.lastSeenAt ?? job.dateScraped ?? new Date().toISOString(),
    dateScraped: job.dateScraped ?? new Date().toISOString(),
  };
}

export function buildJobsFromCandidates(company, candidates, dateScraped = new Date().toISOString()) {
  const uniqueJobs = new Map();

  for (const candidate of candidates) {
    const title = cleanText(candidate?.title ?? '');
    if (!isRelevantTitle(title)) {
      continue;
    }

    const url = pickBestUrl({ ...candidate, title }, company.url);
    if (!url) {
      continue;
    }

    const job = {
      company: company.name,
      title,
      url,
      contextText: cleanText(candidate?.contextText ?? ''),
      dateScraped,
    };

    const key = jobKey(job);
    const existingJob = uniqueJobs.get(key);

    if (!existingJob || title.length > existingJob.title.length) {
      uniqueJobs.set(key, job);
    }
  }

  return Array.from(uniqueJobs.values());
}

export function mergeJobs(scrapedJobs, existingJobs = [], limit = 1000, options = {}) {
  const mergedJobs = new Map();
  const existingByUrl = new Map();
  const existingByTitle = new Map();
  const matchedExistingKeys = new Set();
  const successfulCompanies = new Set(options.successfulCompanies ?? []);
  const normalizedExistingJobs = existingJobs
    .map(normalizeJob)
    .filter(Boolean);
  const latestScrapeTimestamp = scrapedJobs
    .map((job) => normalizeJob(job))
    .filter(Boolean)
    .reduce((latest, job) => latestTimestamp(latest, job.dateScraped, job.lastSeenAt), null);

  for (const job of normalizedExistingJobs) {
    const currentKey = jobKey(job);
    const currentTitleKey = titleKey(job);
    const existingUrlMatch = existingByUrl.get(currentKey);
    const existingTitleMatch = existingByTitle.get(currentTitleKey);

    existingByUrl.set(currentKey, mergeListingVersions(existingUrlMatch, job));
    existingByTitle.set(currentTitleKey, mergeListingVersions(existingTitleMatch, job));
  }

  for (const job of scrapedJobs) {
    const normalizedJob = normalizeJob(job);
    if (!normalizedJob) {
      continue;
    }

    const key = jobKey(normalizedJob);
    const previous = mergedJobs.get(key)
      ?? existingByUrl.get(key)
      ?? existingByTitle.get(titleKey(normalizedJob));

    mergedJobs.set(key, mergeListingVersions(previous, normalizedJob));

    if (previous) {
      matchedExistingKeys.add(jobKey(previous));
    }
  }

  for (const existingJob of normalizedExistingJobs) {
    const key = jobKey(existingJob);
    if (matchedExistingKeys.has(key) || mergedJobs.has(key)) {
      continue;
    }

    if (successfulCompanies.has(existingJob.company)) {
      continue;
    }

    if (isStale(existingJob, latestScrapeTimestamp)) {
      continue;
    }

    mergedJobs.set(key, existingJob);
  }

  return Array.from(mergedJobs.values())
    .sort((left, right) => left.firstSeenAt.localeCompare(right.firstSeenAt))
    .slice(0, limit);
}
