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

const ALLOWED_CATEGORIES = new Set(['job', 'program', 'event']);

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

  if (NON_LISTING_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return false;
  }

  if (ATS_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return true;
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

  const pathSegments = pathname.split('/').filter(Boolean);
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

function jobKey(job) {
  return `${job.company.toLowerCase()}::${cleanText(job.title).toLowerCase()}`;
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
    firstSeenAt: job.firstSeenAt ?? job.dateScraped ?? new Date().toISOString(),
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

    if (!existingJob) {
      uniqueJobs.set(key, job);
    }
  }

  return Array.from(uniqueJobs.values());
}

export function mergeJobs(scrapedJobs, existingJobs = [], limit = 1000) {
  const mergedJobs = new Map();

  for (const job of scrapedJobs) {
    const normalizedJob = normalizeJob(job);
    if (!normalizedJob) {
      continue;
    }

    const key = jobKey(normalizedJob);
    const existingJob = mergedJobs.get(key);

    if (!existingJob) {
      mergedJobs.set(key, normalizedJob);
      continue;
    }

    mergedJobs.set(key, {
      ...existingJob,
      ...normalizedJob,
      firstSeenAt: existingJob.firstSeenAt.localeCompare(normalizedJob.firstSeenAt) <= 0
        ? existingJob.firstSeenAt
        : normalizedJob.firstSeenAt,
      dateScraped: existingJob.dateScraped.localeCompare(normalizedJob.dateScraped) >= 0
        ? existingJob.dateScraped
        : normalizedJob.dateScraped,
    });
  }

  for (const job of existingJobs) {
    const normalizedJob = normalizeJob(job);
    if (!normalizedJob) {
      continue;
    }

    const key = jobKey(normalizedJob);
    if (!mergedJobs.has(key)) {
      mergedJobs.set(key, normalizedJob);
      continue;
    }

    const existingJob = mergedJobs.get(key);
    mergedJobs.set(key, {
      ...normalizedJob,
      ...existingJob,
      firstSeenAt: normalizedJob.firstSeenAt.localeCompare(existingJob.firstSeenAt) <= 0
        ? normalizedJob.firstSeenAt
        : existingJob.firstSeenAt,
      dateScraped: normalizedJob.dateScraped.localeCompare(existingJob.dateScraped) >= 0
        ? normalizedJob.dateScraped
        : existingJob.dateScraped,
    });
  }

  return Array.from(mergedJobs.values())
    .sort((left, right) => left.firstSeenAt.localeCompare(right.firstSeenAt))
    .slice(0, limit);
}
