import path from 'path';
import { env, pipeline } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
const MODEL_CACHE_DIR = path.join(process.cwd(), '.cache', 'huggingface');

env.cacheDir = MODEL_CACHE_DIR;

const CATEGORY_ORDER = ['job', 'program', 'event'];

const PROTOTYPES = {
  category: {
    job: [
      'software engineering internship for computer science students',
      'new grad quantitative developer role',
      'quantitative researcher internship',
      'trading intern opportunity for engineering students',
    ],
    program: [
      'student fellowship program',
      'graduate associate program',
      'rotational early career program',
      'academy or development program for students',
    ],
    event: [
      'campus recruiting event',
      'student summit or networking session',
      'hackathon or information session',
      'career fair or open house event',
    ],
  },
  stage: {
    internship: [
      'internship for software engineering students',
      'quantitative trading intern role',
      'summer intern program',
    ],
    'new-grad': [
      'new grad software engineer role',
      'graduate quantitative researcher role',
      'early career full time engineering role',
    ],
  },
  csFocus: {
    include: [
      'software engineer internship',
      'quantitative researcher internship',
      'trader intern role',
      'machine learning engineer new grad role',
      'developer infrastructure internship',
      'data engineer internship for computer science majors',
    ],
    exclude: [
      'campus recruiter role',
      'human resources internship',
      'operations internship',
      'program manager role',
      'treasury or finance operations role',
      'administrative event coordinator role',
    ],
  },
};

const EVENT_PATTERNS = [
  /\bcareer fair\b/i,
  /\bevents?\b/i,
  /\bhackathon\b/i,
  /\binfo(?:rmation)? session\b/i,
  /\bmeet(?:-|\s)?and(?:-|\s)?greet\b/i,
  /\bnetworking\b/i,
  /\bopen house\b/i,
  /\brecruiting event\b/i,
  /\bsummit\b/i,
  /\bwebinar\b/i,
  /\bworkshop\b/i,
];

const PROGRAM_PATTERNS = [
  /\bacademy\b/i,
  /\bassociate program\b/i,
  /\bfellowships?\b/i,
  /\bgraduate program\b/i,
  /\bleadership program\b/i,
  /\bprograms?\b/i,
  /\brotational\b/i,
];

const JOB_PATTERNS = [
  /\banalyst\b/i,
  /\bassociate\b/i,
  /\bapprenticeship\b/i,
  /\bco-?op\b/i,
  /\bdeveloper\b/i,
  /\bengineer(?:ing)?\b/i,
  /\bintern(?:ship)?s?\b/i,
  /\bmanager\b/i,
  /\bnew grad\b/i,
  /\bquant(?:itative)?\b/i,
  /\brecruiter\b/i,
  /\bresearch(?:er)?\b/i,
  /\bsoftware\b/i,
  /\btrader|trading\b/i,
];

const JOB_STAGE_PATTERNS = {
  internship: [
    /\bco-?op\b/i,
    /\bintern(?:ship)?s?\b/i,
    /\bsummer(?:\s+\d{4})?\b/i,
  ],
  'new-grad': [
    /\bassociate\b/i,
    /\bearly career\b/i,
    /\bgraduate\b/i,
    /\bnew grad\b/i,
  ],
};

const CS_FOCUS_POSITIVE_PATTERNS = [
  /\balgo(?:rithmic)?\b/i,
  /\bc\+\+\b/i,
  /\bc#\b/i,
  /\bdata\b/i,
  /\bdesktop\b/i,
  /\bdeveloper\b/i,
  /\bdevops\b/i,
  /\bengineer(?:ing)?\b/i,
  /\binfrastructure\b/i,
  /\bmachine learning\b/i,
  /\bml\b/i,
  /\bpython\b/i,
  /\bquant(?:itative)?\b/i,
  /\bresearch(?:er)?\b/i,
  /\bsde\b/i,
  /\bsoftware\b/i,
  /\bsre\b/i,
  /\bsystems?\b/i,
  /\btrader|trading\b/i,
];

const CS_FOCUS_NEGATIVE_PATTERNS = [
  /\badmin(?:istrative)?\b/i,
  /\bcommunications?\b/i,
  /\bexecutive\b/i,
  /\bfinance\b/i,
  /\bhuman resources?\b/i,
  /\bhr\b/i,
  /\blegal\b/i,
  /\bmarketing\b/i,
  /\boperations?\b/i,
  /\bpeople\b/i,
  /\bprogram manager\b/i,
  /\brecruiter\b/i,
  /\bsales\b/i,
  /\btalent\b/i,
  /\btreasury\b/i,
];

let extractorPromise;
let prototypeEmbeddingsPromise;

function clampScore(value) {
  return Math.max(0, Math.min(1, value));
}

function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_ID, {
      cache_dir: MODEL_CACHE_DIR,
    });
  }

  return extractorPromise;
}

function listingText(listing) {
  return [listing.company, listing.title, listing.contextText].filter(Boolean).join('. ');
}

function scorePatterns(text, patterns) {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

function maxEntry(record) {
  return Object.entries(record).reduce((best, current) => (
    current[1] > best[1] ? current : best
  ));
}

function averageVectors(vectors) {
  const length = vectors[0].length;
  const output = new Float32Array(length);

  for (const vector of vectors) {
    for (let i = 0; i < length; i += 1) {
      output[i] += vector[i];
    }
  }

  let magnitude = 0;
  for (let i = 0; i < length; i += 1) {
    output[i] /= vectors.length;
    magnitude += output[i] * output[i];
  }

  magnitude = Math.sqrt(magnitude) || 1;
  for (let i = 0; i < length; i += 1) {
    output[i] /= magnitude;
  }

  return output;
}

function dotProduct(left, right) {
  let score = 0;
  for (let i = 0; i < left.length; i += 1) {
    score += left[i] * right[i];
  }

  return score;
}

function tensorToVectors(tensor) {
  const [rows, cols] = tensor.dims.length === 1 ? [1, tensor.dims[0]] : tensor.dims;
  const vectors = [];

  for (let row = 0; row < rows; row += 1) {
    const start = row * cols;
    const end = start + cols;
    vectors.push(Float32Array.from(tensor.data.slice(start, end)));
  }

  return vectors;
}

async function embedTexts(texts) {
  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: 'mean', normalize: true });
  return tensorToVectors(output);
}

async function getPrototypeEmbeddings() {
  if (!prototypeEmbeddingsPromise) {
    prototypeEmbeddingsPromise = (async () => {
      const groupedTexts = [];
      const groupMap = [];

      for (const [groupName, labels] of Object.entries(PROTOTYPES)) {
        for (const [label, texts] of Object.entries(labels)) {
          groupMap.push({ groupName, label, length: texts.length });
          groupedTexts.push(...texts);
        }
      }

      const vectors = await embedTexts(groupedTexts);
      const groupedVectors = {};
      let index = 0;

      for (const { groupName, label, length } of groupMap) {
        groupedVectors[groupName] ??= {};
        groupedVectors[groupName][label] = averageVectors(vectors.slice(index, index + length));
        index += length;
      }

      return groupedVectors;
    })();
  }

  return prototypeEmbeddingsPromise;
}

export function heuristicCategorizeListing(listing) {
  const text = listingText(listing);
  const jobScore = scorePatterns(text, JOB_PATTERNS);
  const programScore = scorePatterns(text, PROGRAM_PATTERNS);
  const eventScore = scorePatterns(text, EVENT_PATTERNS);

  const categoryScores = {
    job: jobScore,
    program: programScore,
    event: eventScore,
  };

  const [category, rawCategoryScore] = maxEntry(categoryScores);
  const stageScores = Object.fromEntries(
    Object.entries(JOB_STAGE_PATTERNS).map(([stage, patterns]) => [stage, scorePatterns(text, patterns)]),
  );
  const [jobTrack, rawStageScore] = maxEntry(stageScores);

  const csPositiveScore = scorePatterns(text, CS_FOCUS_POSITIVE_PATTERNS);
  const csNegativeScore = scorePatterns(text, CS_FOCUS_NEGATIVE_PATTERNS);
  const isEarlyCareerJob = category === 'job' && rawStageScore > 0;
  const isRelevantCsJob = isEarlyCareerJob && csPositiveScore > csNegativeScore;

  return {
    category: rawCategoryScore > 0 ? category : 'other',
    categoryConfidence: clampScore(rawCategoryScore / 3),
    jobTrack: isEarlyCareerJob ? jobTrack : null,
    isRelevantCsJob,
    csConfidence: clampScore((csPositiveScore - csNegativeScore + 2) / 4),
  };
}

export async function categorizeListings(listings) {
  if (listings.length === 0) {
    return [];
  }

  const heuristics = listings.map(heuristicCategorizeListing);

  try {
    const [vectors, prototypeEmbeddings] = await Promise.all([
      embedTexts(listings.map(listingText)),
      getPrototypeEmbeddings(),
    ]);

    return listings.flatMap((listing, index) => {
      const vector = vectors[index];
      const heuristic = heuristics[index];

      const semanticCategoryScores = Object.fromEntries(
        Object.entries(prototypeEmbeddings.category).map(([label, prototype]) => [label, dotProduct(vector, prototype)]),
      );
      const boostedCategoryScores = Object.fromEntries(
        Object.entries(semanticCategoryScores).map(([label, score]) => [
          label,
          score + (heuristic.category === label ? 0.2 : 0),
        ]),
      );
      const [category, categoryScore] = maxEntry(boostedCategoryScores);

      const stageScores = Object.fromEntries(
        Object.entries(prototypeEmbeddings.stage).map(([label, prototype]) => [label, dotProduct(vector, prototype)]),
      );
      const [jobTrack, stageScore] = maxEntry(stageScores);

      const includeScore = dotProduct(vector, prototypeEmbeddings.csFocus.include);
      const excludeScore = dotProduct(vector, prototypeEmbeddings.csFocus.exclude);
      const jobTrackIsEarlyCareer = category === 'job' && (
        stageScore >= 0.34 || heuristic.jobTrack !== null
      );
      const isRelevantCsJob = jobTrackIsEarlyCareer && (
        includeScore - excludeScore >= 0.04 || heuristic.isRelevantCsJob
      );

      if (category === 'job' && !isRelevantCsJob) {
        return [];
      }

      if (!CATEGORY_ORDER.includes(category)) {
        return [];
      }

      return [{
        ...listing,
        category,
        jobTrack: category === 'job' ? (heuristic.jobTrack ?? jobTrack) : null,
        categoryConfidence: clampScore((categoryScore + 1) / 2),
        classificationModel: MODEL_ID,
      }];
    });
  } catch (error) {
    console.warn(`Semantic classifier unavailable, falling back to heuristics: ${error.message}`);

    return listings.flatMap((listing, index) => {
      const heuristic = heuristics[index];

      if (!CATEGORY_ORDER.includes(heuristic.category)) {
        return [];
      }

      if (heuristic.category === 'job' && !heuristic.isRelevantCsJob) {
        return [];
      }

      return [{
        ...listing,
        category: heuristic.category,
        jobTrack: heuristic.category === 'job' ? heuristic.jobTrack : null,
        categoryConfidence: heuristic.categoryConfidence,
        classificationModel: 'heuristic-fallback',
      }];
    });
  }
}

export { MODEL_CACHE_DIR, MODEL_ID, CATEGORY_ORDER };
