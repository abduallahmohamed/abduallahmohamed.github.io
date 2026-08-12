// ─────────────────────────────────────────────────────────────────────────────
// Scrape Google Scholar and regenerate client/src/data/publications.ts.
// Run monthly by .github/workflows/update-scholar.yml.
//
// If Scholar blocks the request (common from datacenter/CI IPs) or returns no
// rows, the script exits 0 WITHOUT writing — the existing data is left intact
// and the workflow simply produces no diff. It never wipes good data.
// ─────────────────────────────────────────────────────────────────────────────
import * as cheerio from "cheerio";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const SCHOLAR_URL =
  "https://scholar.google.com/citations?hl=en&user=FAOtbV4AAAAJ&sortby=pubdate&pagesize=100";

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../client/src/data/publications.ts"
);

// ─── Curated overrides ───────────────────────────────────────────────────────
// Matched by case-insensitive substring against the scraped title. When a paper
// matches, these clean values win over the messy scraped venue/link. Edit here
// (title casing, venue label, arXiv/GitHub links, demo flag) — this is the
// source of truth for curation; the generated .ts file is overwritten.
const CURATED = [
  { match: "egoinertia", title: "EgoInertia-MI: A Multimodal Egocentric Vision and IMU Benchmark for Motor Impairment Assessment", venue: "arXiv", link: "https://arxiv.org/abs/2607.03934", github: null, demo: false },
  { match: "pave: a cognitive", title: "PAVE: A Cognitive Architecture for Legitimate Violation in Generative Agent Societies", venue: "arXiv", link: "https://arxiv.org/abs/2605.19351", github: null, demo: false },
  { match: "egotraj", title: "EgoTraj: Real-World Egocentric Human Trajectory Dataset for Multimodal Prediction", venue: "arXiv", link: "https://arxiv.org/abs/2605.19004", github: null, demo: false },
  { match: "imotion-llm", title: "iMotion-LLM: Instruction-Conditioned Trajectory Generation", venue: "WACV", link: "https://arxiv.org/abs/2403.04928", github: null, demo: false },
  { match: "video captioning", title: "A Review of Deep Learning for Video Captioning", venue: "IEEE TPAMI", link: "https://scholar.google.com/citations?user=FAOtbV4AAAAJ", github: null, demo: false },
  { match: "followme", title: "FollowMe: Vehicle Behaviour Prediction in Autonomous Vehicle Settings", venue: "arXiv", link: "https://arxiv.org/abs/2304.06121", github: null, demo: false },
  { match: "social-implicit", title: "Social-Implicit: Rethinking Trajectory Prediction Evaluation and The Effectiveness of Implicit MLE", venue: "ECCV", link: "https://arxiv.org/abs/2203.03057", github: "https://github.com/abduallahmohamed/Social-Implicit", demo: false },
  { match: "har-gcnn", title: "HAR-GCNN: Deep Graph CNNs for Human Activity Recognition From Highly Unlabeled Mobile Sensor Data", venue: "IEEE PerCom", link: "https://arxiv.org/abs/2011.01902", github: null, demo: false },
  { match: "motion and action prediction", title: "On the Motion and Action Prediction Using Deep Graph Models (PhD Thesis)", venue: "UT Austin", link: "https://repositories.lib.utexas.edu/handle/2152/115782", github: null, demo: false },
  { match: "skeleton-graph", title: "Skeleton-Graph: Long-Term 3D Motion Prediction From 2D Observations Using Deep Spatio-Temporal Graph CNNs", venue: "ICCV Workshop", link: "https://arxiv.org/abs/2109.10257", github: null, demo: false },
  { match: "sotif", title: "Putting SOTIF into Practice: Safety Critical Event Detection Using Predictive Models", venue: "SAE Technical Paper", link: "https://www.sae.org/publications/technical-papers/content/2021-01-0089/", github: null, demo: false },
  { match: "social-stgcnn", title: "SocialSTGCNN: A Social Spatio-Temporal Graph Convolutional Neural Network for Human Trajectory Prediction", venue: "CVPR", link: "https://arxiv.org/abs/2002.11927", github: "https://github.com/abduallahmohamed/Social-STGCNN", demo: true },
  { match: "inner ensemble", title: "Inner Ensemble Networks: Average Ensemble as an Effective Regularizer", venue: "arXiv", link: "https://arxiv.org/abs/2006.08305", github: "https://github.com/abduallahmohamed/inner_ensemble_nets", demo: false },
  { match: "physics informed", title: "Physics Informed Data Driven Model for Flood Prediction: Application of Deep Learning in Prediction of Urban Flood Development", venue: "arXiv", link: "https://arxiv.org/abs/1908.10312", github: null, demo: false },
  { match: "imu-based traffic", title: "An IMU-based Traffic and Road Condition Monitoring System", venue: "HardwareX", link: "https://www.sciencedirect.com/science/article/pii/S2468067218300543", github: null, demo: false },
  { match: "mcrm", title: "MCRM: Mother Compact Recurrent Memory", venue: "arXiv", link: "https://arxiv.org/abs/1808.02016", github: null, demo: false },
  { match: "locating an object", title: "Locating an Object in the Environment of a Motor Vehicle by an Ultrasonic Sensor System", venue: "DE Patent DE102017101476B3", link: "https://patents.google.com/patent/DE102017101476B3", github: null, demo: false },
];

function findOverride(title) {
  const t = title.toLowerCase();
  return CURATED.find((c) => t.includes(c.match)) || null;
}

// Best-effort cleanup for brand-new papers with no curated entry yet.
function cleanVenue(raw) {
  if (!raw || raw === "—") return "—";
  if (/arxiv/i.test(raw)) return "arXiv";
  return raw.replace(/,?\s*\d{4}\s*$/, "").trim() || "—"; // drop trailing year
}
function deriveLink(rawVenue, scholarHref) {
  const m = /arXiv:(\d+\.\d+)/i.exec(rawVenue || "");
  if (m) return `https://arxiv.org/abs/${m[1]}`;
  if (scholarHref && scholarHref.startsWith("/")) return "https://scholar.google.com" + scholarHref;
  return scholarHref || "https://scholar.google.com/citations?user=FAOtbV4AAAAJ";
}

async function fetchScholar() {
  const res = await fetch(SCHOLAR_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Scholar fetch failed: ${res.status}`);
  const html = await res.text();
  if (html.includes("unusual traffic") || html.includes("captcha") || !html.includes("gsc_a_tr")) {
    throw new Error("Scholar returned a bot-block / CAPTCHA page");
  }

  const $ = cheerio.load(html);
  let totalCitations = 0;
  $(".gsc_rsb_std").each((i, el) => {
    if (i === 0) totalCitations = parseInt($(el).text().replace(/,/g, ""), 10) || 0;
  });

  const pubs = [];
  $(".gsc_a_tr").each((_i, row) => {
    const titleEl = $(row).find(".gsc_a_at");
    const scrapedTitle = titleEl.text().trim();
    const href = titleEl.attr("href") || "";
    const rawVenue = $(row).find(".gs_gray").eq(1).text().trim() || "—";
    const year = $(row).find(".gsc_a_y span").text().trim() || "—";
    const citText = $(row).find(".gsc_a_c a").text().trim();
    const citations = citText && citText !== "*" ? parseInt(citText, 10) : null;
    if (!scrapedTitle) return;

    const lt = scrapedTitle.toLowerCase();
    const isNoise =
      rawVenue.toLowerCase().includes("github") ||
      lt.startsWith("abduallahmohamed/") ||
      lt.includes("bringing smart transport") ||
      lt.includes("smart transport to texans") ||
      lt.includes("weather-savvy roads") ||
      lt.includes("predicting crowd trajectories using deep graph") ||
      lt.includes("artificial intelligence track committee") ||
      lt.includes("deep-learning based trajectory forecast for safety");
    if (isNoise) return;

    const ov = findOverride(scrapedTitle);
    pubs.push({
      year,
      title: ov ? ov.title : scrapedTitle,
      venue: ov ? ov.venue : cleanVenue(rawVenue),
      citations: Number.isNaN(citations) ? null : citations,
      link: ov ? ov.link : deriveLink(rawVenue, href),
      demo: ov ? ov.demo : false,
      github: ov ? ov.github : null,
    });
  });

  if (pubs.length === 0) throw new Error("Scholar returned 0 publications — likely blocked");
  return { totalCitations, pubs };
}

function render({ totalCitations, pubs }) {
  const rows = pubs
    .map(
      (p) =>
        `  { year: ${JSON.stringify(p.year)}, title: ${JSON.stringify(p.title)}, venue: ${JSON.stringify(
          p.venue
        )}, citations: ${p.citations === null ? "null" : p.citations}, link: ${JSON.stringify(
          p.link
        )}, demo: ${p.demo}, github: ${p.github === null ? "null" : JSON.stringify(p.github)} },`
    )
    .join("\n");

  return `// ─────────────────────────────────────────────────────────────────────────────
// AUTO-GENERATED by scripts/update-scholar.mjs (monthly GitHub Action).
// Curated venue/link/github/demo overrides live in that script's CURATED map —
// edit them there, not here, or they get overwritten on the next refresh.
// ─────────────────────────────────────────────────────────────────────────────

export interface Publication {
  title: string;
  venue: string;
  year: string;
  citations: number | null;
  link: string;
  github: string | null;
  demo: boolean;
}

export const staticTotalCitations = ${totalCitations};

export const staticPublications: Publication[] = [
${rows}
];
`;
}

try {
  const data = await fetchScholar();
  writeFileSync(OUT, render(data), "utf-8");
  console.log(`Updated: ${data.pubs.length} publications, ${data.totalCitations} citations`);
} catch (err) {
  console.warn(`Scholar refresh skipped (data left unchanged): ${err.message}`);
  process.exit(0); // no-op, do not fail the workflow or wipe data
}
