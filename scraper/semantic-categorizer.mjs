import path from 'path';
import { env, pipeline } from '@huggingface/transformers';

const MODEL_ID = 'Xenova/paraphrase-MiniLM-L3-v2';
const MODEL_CACHE_DIR = path.join(process.cwd(), '.cache', 'huggingface');

env.cacheDir = MODEL_CACHE_DIR;

const CATEGORY_ORDER = ['internship', 'new-grad', 'program'];

const PROTOTYPES = {
  category: {
    internship: [
      'software engineering internship for computer science students',
      'quantitative developer intern role',
      'machine learning internship at a trading firm',
      'quant researcher internship for engineering majors',
    ],
    'new-grad': [
      'new grad software engineer role at a quant firm',
      'graduate quantitative developer opportunity',
      'early career machine learning engineer position',
      'new graduate researcher or trader role for cs majors',
    ],
    program: [
      'student fellowship or rotational program',
      'campus recruiting summit or insight day',
      'graduate academy, scholarship, or learning program',
      'networking event, challenge, or information session for students',
    ],
  },
  csFocus: {
    include: [
      'software engineer internship',
      'quantitative researcher internship',
      'developer role for computer science majors',
      'machine learning engineer new grad role',
      'trading technology internship',
      'python or c plus plus developer position',
    ],
    exclude: [
      'campus recruiter role',
      'finance internship',
      'human resources internship',
      'operations internship',
      'marketing or communications program',
      'finance operations analyst role',
      'administrative recruiting coordinator position',
    ],
  },
};

const INTERNSHIP_PATTERNS = [
  /\bco-?op\b/i,
  /\bintern(?:ship)?s?\b/i,
  /\boff-cycle\b/i,
  /\bsummer(?:\s+\d{4})?\b/i,
];

const NEW_GRAD_PATTERNS = [
  /\bassociate(?:\s+program)?\b/i,
  /\bearly career\b/i,
  /\bfull[- ]time\b/i,
  /\bgraduate\b/i,
  /\bnew grad(?:uate)?\b/i,
  /\buniversity grad(?:uate)?\b/i,
];

const PROGRAM_PATTERNS = [
  /\bacademy\b/i,
  /\bchallenge\b/i,
  /\bevents?\b/i,
  /\bfellowships?\b/i,
  /\bhackathon\b/i,
  /\binfo(?:rmation)? session\b/i,
  /\binsight\b/i,
  /\bopen house\b/i,
  /\bprograms?\b/i,
  /\brotational\b/i,
  /\bscholar(ship)?\b/i,
  /\bsummit\b/i,
  /\bwebinar\b/i,
  /\bworkshop\b/i,
];

const PROGRAM_EXCLUDE_PATTERNS = [
  /\bcampus recruiter\b/i,
  /\bcampus talent\b/i,
  /\bprogram manager\b/i,
  /\brecruit(?:er|ing)\b/i,
  /\btalent acquisition\b/i,
];

const TECHNICAL_ROLE_PATTERNS = [
  /\balgorithm(?:ic)?\b/i,
  /\bc\+\+\b/i,
  /\bc#\b/i,
  /\bcomputer science\b/i,
  /\bdata\b/i,
  /\bdeveloper\b/i,
  /\bengineer(?:ing)?\b/i,
  /\binfrastructure\b/i,
  /\bmachine learning\b/i,
  /\bml\b/i,
  /\bpython\b/i,
  /\bquant(?:itative)?\b/i,
  /\bresearch(?:er)?\b/i,
  /\bsoftware\b/i,
  /\bsystems?\b/i,
  /\btrader|trading\b/i,
];

const NON_TECHNICAL_PATTERNS = [
  /\badmin(?:istrative)?\b/i,
  /\bcommunications?\b/i,
  /\bfinance\b/i,
  /\bhuman resources?\b/i,
  /\bhr\b/i,
  /\blegal\b/i,
  /\bmarketing\b/i,
  /\boperations?\b/i,
  /\bpeople\b/i,
  /\bprogram manager\b/i,
  /\brecruit(?:er|ing)\b/i,
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

function roleText(listing) {
  return [listing.title, listing.contextText].filter(Boolean).join('. ');
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
    for (let index = 0; index < length; index += 1) {
      output[index] += vector[index];
    }
  }

  let magnitude = 0;
  for (let index = 0; index < length; index += 1) {
    output[index] /= vectors.length;
    magnitude += output[index] * output[index];
  }

  magnitude = Math.sqrt(magnitude) || 1;
  for (let index = 0; index < length; index += 1) {
    output[index] /= magnitude;
  }

  return output;
}

function dotProduct(left, right) {
  let score = 0;
  for (let index = 0; index < left.length; index += 1) {
    score += left[index] * right[index];
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
  const text = roleText(listing) || listingText(listing);
  const internshipScore = scorePatterns(text, INTERNSHIP_PATTERNS);
  const newGradScore = scorePatterns(text, NEW_GRAD_PATTERNS);
  const programScore = scorePatterns(text, PROGRAM_PATTERNS);
  const programExclusionScore = scorePatterns(text, PROGRAM_EXCLUDE_PATTERNS);
  const technicalScore = scorePatterns(text, TECHNICAL_ROLE_PATTERNS);
  const nonTechnicalScore = scorePatterns(text, NON_TECHNICAL_PATTERNS);
  const isRelevantCsRole = technicalScore > 0 && technicalScore >= nonTechnicalScore;

  let category = 'other';
  let rawCategoryScore = 0;

  if (internshipScore > 0 && isRelevantCsRole) {
    category = 'internship';
    rawCategoryScore = internshipScore + technicalScore;
  } else if (newGradScore > 0 && isRelevantCsRole) {
    category = 'new-grad';
    rawCategoryScore = newGradScore + technicalScore;
  } else if (programScore > 0 && programExclusionScore === 0) {
    category = 'program';
    rawCategoryScore = programScore;
  }

  return {
    category,
    categoryConfidence: clampScore(rawCategoryScore / 4),
    isRelevantCsRole,
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
          score + (heuristic.category === label ? 0.25 : 0),
        ]),
      );
      const [semanticCategory, categoryScore] = maxEntry(boostedCategoryScores);
      const category = heuristic.category !== 'other'
        && boostedCategoryScores[heuristic.category] >= categoryScore - 0.03
        ? heuristic.category
        : semanticCategory;

      if (!CATEGORY_ORDER.includes(category)) {
        return [];
      }

      const includeScore = dotProduct(vector, prototypeEmbeddings.csFocus.include);
      const excludeScore = dotProduct(vector, prototypeEmbeddings.csFocus.exclude);
      const isTechnicalBucket = category === 'internship' || category === 'new-grad';
      const listingSummary = roleText(listing) || listingText(listing);
      const nonTechnicalScore = scorePatterns(listingSummary, NON_TECHNICAL_PATTERNS);
      const isRelevantCsRole = (
        heuristic.isRelevantCsRole || includeScore - excludeScore >= 0.03
      ) && nonTechnicalScore === 0;
      const hasProgramExclusion = scorePatterns(listingSummary, PROGRAM_EXCLUDE_PATTERNS) > 0;

      if (isTechnicalBucket && !isRelevantCsRole) {
        return [];
      }

      if (category === 'program' && hasProgramExclusion && heuristic.category !== 'program') {
        return [];
      }

      return [{
        ...listing,
        category,
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

      if ((heuristic.category === 'internship' || heuristic.category === 'new-grad') && !heuristic.isRelevantCsRole) {
        return [];
      }

      return [{
        ...listing,
        category: heuristic.category,
        categoryConfidence: heuristic.categoryConfidence,
        classificationModel: 'heuristic-fallback',
      }];
    });
  }
}

export { MODEL_CACHE_DIR, MODEL_ID, CATEGORY_ORDER };
