import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { companies } from './companies.mjs';

const DATA_FILE = path.join(process.cwd(), 'public', 'data.json');

async function scrapeCompany(browser, company) {
  console.log(`Scraping ${company.name}...`);
  const page = await browser.newPage();
  
  // Minimal anti-bot
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    await page.goto(company.url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    const rawJobs = await page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);
      return Array.from(elements).map(el => el.textContent.trim());
    }, company.selector || 'h3, h4, .job-title');

    // Filter out common non-job noise 
    const noiseWords = ['about', 'contact', 'home', 'careers', 'privacy', 'terms', 'apply', 'login', 'log in', 'team', 'faq', 'cookie'];
    const jobs = rawJobs.filter(title => {
      if (!title) return false;
      if (title.length < 5 || title.length > 120) return false;
      const lower = title.toLowerCase();
      // Remove generic menu items if the text EXACTLY matches or strongly contains them without other job contexts
      if (noiseWords.some(w => lower === w || lower === `${w} us`)) return false;
      // Exclude simple navigation junk
      if (lower.includes('read more') || lower.includes('learn more')) return false;
      return true;
    });

    // Deduplicate any identical scraped strings on the same page
    const uniqueJobs = [...new Set(jobs)];

    await page.close();
    
    return uniqueJobs.map(title => ({
      company: company.name,
      title: title,
      url: company.url, // In real life, link specifically to the job
      dateScraped: new Date().toISOString()
    }));
  } catch (err) {
    console.error(`Failed to scrape ${company.name}:`, err.message);
    await page.close();
    return [];
  }
}

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const allJobs = [];

  for (const company of companies) {
    const jobs = await scrapeCompany(browser, company);
    allJobs.push(...jobs);
  }

  await browser.close();

  // Load existing data to preserve unchanged items or handle diffs
  let existingData = [];
  try {
    if (fs.existsSync(DATA_FILE)) {
      existingData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn("Could not read previous data, starting fresh.");
  }

  // Merge (a real system would do proper diffing to find 'new' jobs for email notifications)
  const fullList = [...allJobs, ...existingData].slice(0, 1000); // keep it bounded

  // Write to public folder for static Next.js export to read
  fs.writeFileSync(DATA_FILE, JSON.stringify(fullList, null, 2));
  console.log(`Saved ${fullList.length} jobs to ${DATA_FILE}`);
}

run().catch(console.error);
