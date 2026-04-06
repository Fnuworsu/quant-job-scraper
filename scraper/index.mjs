import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { companies } from './companies.mjs';
import { buildJobsFromCandidates, mergeJobs } from './job-utils.mjs';
import { categorizeListings } from './semantic-categorizer.mjs';

const DATA_FILE = path.join(process.cwd(), 'public', 'data.json');

async function launchBrowser() {
  return puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}

async function scrapeCompany(browser, company) {
  console.log(`Scraping ${company.name}...`);
  const page = await browser.newPage();
  
  // Minimal anti-bot
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    await page.goto(company.url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('a[href]', { timeout: 5000 }).catch(() => {});
    
    const rawCandidates = await page.evaluate((sel) => {
      const clean = (value = '') => value.replace(/\s+/g, ' ').trim();
      const getText = (element) =>
        clean(
          element?.getAttribute?.('aria-label') ??
            element?.getAttribute?.('title') ??
            element?.textContent ??
            '',
        );

      const elements = [
        ...document.querySelectorAll(sel),
        ...document.querySelectorAll('a[href]'),
      ];
      const seen = new Set();
      const candidates = [];

      for (const element of elements) {
        if (!(element instanceof Element)) {
          continue;
        }

        const container =
          element.closest(
            'article, li, tr, .job, .job-card, .job-item, .opening, .opening-card, .position, .posting',
          ) ??
          element.parentElement ??
          element;
        const relatedLinks = new Set();
        const directLink = element.closest('a[href]');

        if (directLink) {
          relatedLinks.add(directLink);
        }

        if (container.matches('a[href]')) {
          relatedLinks.add(container);
        }

        for (const link of container.querySelectorAll('a[href]')) {
          relatedLinks.add(link);
        }

        const candidate = {
          title: getText(element),
          href: directLink instanceof HTMLAnchorElement ? directLink.href : null,
          linkText: getText(directLink),
          contextText: getText(container),
          linkOptions: Array.from(relatedLinks)
            .slice(0, 8)
            .map((link) => ({
              href: link.href,
              text: getText(link),
            })),
        };

        const key = JSON.stringify([
          candidate.title,
          candidate.href,
          candidate.linkOptions.map((option) => option.href),
        ]);

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        candidates.push(candidate);
      }

      return candidates;
    }, company.selector || 'a[href], h1, h2, h3, h4, .job-title, .posting-title');

    const jobs = buildJobsFromCandidates(company, rawCandidates);
    return { jobs, success: true };
  } catch (err) {
    console.error(`Failed to scrape ${company.name}:`, err.message);
    return { jobs: [], success: false };
  } finally {
    await page.close().catch(() => {});
  }
}

async function run() {
  let browser = await launchBrowser();
  const allJobs = [];
  const successfulCompanies = new Set();

  for (const company of companies) {
    if (!browser.connected) {
      console.warn('Browser disconnected. Relaunching scrape session...');
      browser = await launchBrowser();
    }

    const { jobs, success } = await scrapeCompany(browser, company);
    if (success) {
      successfulCompanies.add(company.name);
    }
    allJobs.push(...jobs);
  }

  await browser.close().catch(() => {});
  const categorizedJobs = await categorizeListings(allJobs);

  // Load existing data to preserve unchanged items or handle diffs
  let existingData = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch {
    console.warn("Could not read previous data, starting fresh.");
  }

  const fullList = mergeJobs(categorizedJobs, existingData, 1000, { successfulCompanies });

  // Write to public folder for static Next.js export to read
  fs.writeFileSync(DATA_FILE, JSON.stringify(fullList, null, 2));
  console.log(`Saved ${fullList.length} jobs to ${DATA_FILE}`);
}

run().catch(console.error);
