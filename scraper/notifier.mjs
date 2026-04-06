import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import 'dotenv/config';

// The user must provide RESEND_API_KEY in their environment variables
// and configure SUBSCRIBER_EMAILS (comma separated)
const resend = new Resend(process.env.RESEND_API_KEY);

const DATA_FILE = path.join(process.cwd(), 'public', 'data.json');
const PREV_DATA_FILE = path.join(process.cwd(), 'public', 'data.prev.json');
const CATEGORY_LABELS = {
  internship: 'Internship',
  'new-grad': 'New Grad',
  program: 'Program',
};

async function notify() {
  if (!process.env.RESEND_API_KEY) {
    console.warn("No RESEND_API_KEY provided. Skipping email notifications.");
    return;
  }

  let currentData = [];
  let prevData = [];

  try {
    if (fs.existsSync(DATA_FILE)) {
      currentData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    if (fs.existsSync(PREV_DATA_FILE)) {
      prevData = JSON.parse(fs.readFileSync(PREV_DATA_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error("Error reading data files:", err);
    return;
  }

  // Very naive diffing: just checking if there are current items not in prev
  const prevUrls = new Set(prevData.map(d => d.url + d.title));
  const newJobs = currentData.filter(d => !prevUrls.has(d.url + d.title));

  if (newJobs.length === 0) {
    console.log("No new jobs found. No emails to send.");
    return;
  }

  console.log(`Found ${newJobs.length} new jobs. Preparing notifications...`);

  const emailsString = process.env.SUBSCRIBER_EMAILS || 'test@example.com';
  const recipients = emailsString.split(',').map(e => e.trim());

  let htmlBody = `<h1>New Quant Listings Detected</h1><ul>`;
  newJobs.slice(0, 10).forEach(job => {
    const label = job.category ? ` [${CATEGORY_LABELS[job.category] ?? job.category}]` : '';
    htmlBody += `<li><strong>${job.company}</strong>${label}: <a href="${job.url}">${job.title}</a></li>`;
  });
  if (newJobs.length > 10) {
    htmlBody += `<li>...and ${newJobs.length - 10} more. Check the dashboard!</li>`;
  }
  htmlBody += `</ul><p><a href="https://your-github-username.github.io/quant-search">View Dashboard</a></p>`;

  try {
    const data = await resend.emails.send({
      from: 'Quant Board <onboarding@resend.dev>', // You should use your domain here
      to: recipients,
      subject: `[Quant Board] ${newJobs.length} New Listings!`,
      html: htmlBody,
    });
    console.log("Email sent successfully", data);
  } catch (error) {
    console.error("Email sending failed:", error);
  }
}

notify().catch(console.error);
