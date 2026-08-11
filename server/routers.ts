import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as cheerio from "cheerio";
import { getDb } from "./db";
import { scholarCache } from "../drizzle/schema";
import { desc } from "drizzle-orm";

const SCHOLAR_URL =
  "https://scholar.google.com/citations?hl=en&user=FAOtbV4AAAAJ&sortby=pubdate&pagesize=100";

// Cache refresh interval: 6 hours
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ─── Known-good seed data (last verified 2026-03-08) ─────────────────────────
const SEED_PUBLICATIONS = [
  { title: "iMotion-LLM: Instruction-Conditioned Trajectory Generation", venue: "WACV", year: "2026", citations: null, link: "https://scholar.google.com/citations?user=FAOtbV4AAAAJ", github: null, demo: false },
  { title: "A Review of Deep Learning for Video Captioning", venue: "IEEE TPAMI", year: "2024", citations: 63, link: "https://scholar.google.com/citations?user=FAOtbV4AAAAJ", github: null, demo: false },
  { title: "iMotion-LLM: Motion Prediction Instruction Tuning", venue: "arXiv", year: "2024", citations: 3, link: "https://arxiv.org/abs/2403.04928", github: null, demo: false },
  { title: "FollowMe: Vehicle Behaviour Prediction in Autonomous Vehicle Settings", venue: "arXiv", year: "2023", citations: null, link: "https://arxiv.org/abs/2304.06121", github: null, demo: false },
  { title: "Social-Implicit: Rethinking Trajectory Prediction Evaluation and The Effectiveness of Implicit MLE", venue: "ECCV", year: "2022", citations: 144, link: "https://arxiv.org/abs/2203.03057", github: "https://github.com/abduallahmohamed/Social-Implicit", demo: false },
  { title: "HAR-GCNN: Deep Graph CNNs for Human Activity Recognition From Highly Unlabeled Mobile Sensor Data", venue: "IEEE PerCom", year: "2022", citations: 42, link: "https://arxiv.org/abs/2011.01902", github: null, demo: false },
  { title: "On the Motion and Action Prediction Using Deep Graph Models (PhD Thesis)", venue: "UT Austin", year: "2022", citations: null, link: "https://repositories.lib.utexas.edu/handle/2152/115782", github: null, demo: false },
  { title: "Skeleton-Graph: Long-Term 3D Motion Prediction From 2D Observations Using Deep Spatio-Temporal Graph CNNs", venue: "ICCV Workshop", year: "2021", citations: 13, link: "https://arxiv.org/abs/2109.10257", github: null, demo: false },
  { title: "Putting SOTIF into Practice: Safety Critical Event Detection Using Predictive Models", venue: "SAE Technical Paper", year: "2021", citations: 13, link: "https://www.sae.org/publications/technical-papers/content/2021-01-0089/", github: null, demo: false },
  { title: "SocialSTGCNN: A Social Spatio-Temporal Graph Convolutional Neural Network for Human Trajectory Prediction", venue: "CVPR", year: "2020", citations: 1334, link: "https://arxiv.org/abs/2002.11927", github: "https://github.com/abduallahmohamed/Social-STGCNN", demo: true },
  { title: "Inner Ensemble Networks: Average Ensemble as an Effective Regularizer", venue: "arXiv", year: "2020", citations: 1, link: "https://arxiv.org/abs/2006.08305", github: "https://github.com/abduallahmohamed/inner_ensemble_nets", demo: false },
  { title: "Physics Informed Data Driven Model for Flood Prediction: Application of Deep Learning in Prediction of Urban Flood Development", venue: "arXiv", year: "2019", citations: 45, link: "https://arxiv.org/abs/1908.10312", github: null, demo: false },
  { title: "An IMU-based Traffic and Road Condition Monitoring System", venue: "HardwareX", year: "2018", citations: 37, link: "https://www.sciencedirect.com/science/article/pii/S2468067218300543", github: null, demo: false },
  { title: "MCRM: Mother Compact Recurrent Memory", venue: "arXiv", year: "2018", citations: 1, link: "https://arxiv.org/abs/1808.02016", github: null, demo: false },
];
const SEED_TOTAL_CITATIONS = 1699;

// ─── Static link overrides ────────────────────────────────────────────────────
const STATIC_LINKS: Record<string, string> = {
  "SocialSTGCNN": "https://arxiv.org/abs/2002.11927",
  "Social-Implicit": "https://arxiv.org/abs/2203.03057",
  "HAR-GCNN": "https://arxiv.org/abs/2011.01902",
  "Skeleton-Graph": "https://arxiv.org/abs/2109.10257",
  "iMotion-LLM: Motion Prediction": "https://arxiv.org/abs/2403.04928",
  "iMotion-LLM: Instruction": "https://scholar.google.com/citations?user=FAOtbV4AAAAJ",
  "FollowMe": "https://arxiv.org/abs/2304.06121",
  "Inner Ensemble": "https://arxiv.org/abs/2006.08305",
  "Physics Informed": "https://arxiv.org/abs/1908.10312",
  "IMU-based Traffic": "https://www.sciencedirect.com/science/article/pii/S2468067218300543",
  "MCRM": "https://arxiv.org/abs/1808.02016",
  "SOTIF": "https://www.sae.org/publications/technical-papers/content/2021-01-0089/",
  "Deep Learning for Video Captioning": "https://scholar.google.com/citations?user=FAOtbV4AAAAJ",
  "PhD Thesis": "https://repositories.lib.utexas.edu/handle/2152/115782",
};

const GITHUB_LINKS: Record<string, string> = {
  "SocialSTGCNN": "https://github.com/abduallahmohamed/Social-STGCNN",
  "Social-Implicit": "https://github.com/abduallahmohamed/Social-Implicit",
  "Inner Ensemble": "https://github.com/abduallahmohamed/inner_ensemble_nets",
};

function resolveLink(title: string, scholarHref: string): string {
  for (const [key, url] of Object.entries(STATIC_LINKS)) {
    if (title.includes(key)) return url;
  }
  if (scholarHref && scholarHref.startsWith("/")) {
    return "https://scholar.google.com" + scholarHref;
  }
  return scholarHref || "https://scholar.google.com/citations?user=FAOtbV4AAAAJ";
}

function resolveGithub(title: string): string | null {
  for (const [key, url] of Object.entries(GITHUB_LINKS)) {
    if (title.includes(key)) return url;
  }
  return null;
}

// ─── Scholar scraper ──────────────────────────────────────────────────────────
async function fetchScholarPublications() {
  const res = await fetch(SCHOLAR_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Connection": "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Cache-Control": "max-age=0",
    },
  });

  if (!res.ok) throw new Error(`Scholar fetch failed: ${res.status}`);
  const html = await res.text();

  // Detect bot block page (Scholar sometimes returns 200 but with a CAPTCHA page)
  if (html.includes("unusual traffic") || html.includes("captcha") || !html.includes("gsc_a_tr")) {
    throw new Error("Scholar returned bot-block page");
  }

  const $ = cheerio.load(html);

  let totalCitations = 0;
  $(".gsc_rsb_std").each((i, el) => {
    if (i === 0) {
      totalCitations = parseInt($(el).text().replace(/,/g, ""), 10) || 0;
    }
  });

  const pubs: Array<{
    title: string; venue: string; year: string;
    citations: number | null; link: string; github: string | null; demo: boolean;
  }> = [];

  $(".gsc_a_tr").each((_i, row) => {
    const titleEl = $(row).find(".gsc_a_at");
    const title = titleEl.text().trim();
    const href = titleEl.attr("href") || "";
    const venueEl = $(row).find(".gs_gray").eq(1);
    const venue = venueEl.text().trim() || "—";
    const yearEl = $(row).find(".gsc_a_y span");
    const year = yearEl.text().trim() || "—";
    const citEl = $(row).find(".gsc_a_c a");
    const citText = citEl.text().trim();
    const citations = citText && citText !== "*" ? parseInt(citText, 10) : null;
    if (!title) return;

    // Filter out noise: GitHub repos, transport reports, committee entries
    const isNoise = (
      venue.toLowerCase().includes("github") ||
      title.toLowerCase().startsWith("abduallahmohamed/") ||
      title.toLowerCase().includes("bringing smart transport") ||
      title.toLowerCase().includes("smart transport to texans") ||
      title.toLowerCase().includes("weather-savvy roads") ||
      title.toLowerCase().includes("predicting crowd trajectories using deep graph") ||
      title.toLowerCase().includes("artificial intelligence track committee") ||
      title.toLowerCase().includes("deep-learning based trajectory forecast for safety") ||
      (venue === "—" && (citations === null || citations === 0) && title.toLowerCase().includes("phase"))
    );
    if (isNoise) return;

    pubs.push({
      title, venue, year,
      citations: isNaN(citations as number) ? null : citations,
      link: resolveLink(title, href),
      github: resolveGithub(title),
      demo: title.includes("SocialSTGCNN"),
    });
  });

  if (pubs.length === 0) throw new Error("Scholar returned 0 publications — likely blocked");

  return { publications: pubs, totalCitations };
}

// ─── DB cache helpers ─────────────────────────────────────────────────────────
async function getFromCache() {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db.select().from(scholarCache).orderBy(desc(scholarCache.fetchedAt)).limit(1);
    if (rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
  }
}

async function saveToCache(totalCitations: number, publications: unknown[]) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(scholarCache).values({
      totalCitations,
      publicationsJson: JSON.stringify(publications),
      fetchedAt: new Date(),
    });
    // Keep only the latest 5 rows to avoid unbounded growth
    const rows = await db.select().from(scholarCache).orderBy(desc(scholarCache.fetchedAt));
    if (rows.length > 5) {
      const toDelete = rows.slice(5);
      for (const row of toDelete) {
        await db.delete(scholarCache).where(
          (await import("drizzle-orm")).eq(scholarCache.id, row.id)
        );
      }
    }
  } catch (err) {
    console.error("[Scholar Cache] Failed to save:", err);
  }
}

async function ensureSeedData() {
  const db = await getDb();
  if (!db) return;
  try {
    const rows = await db.select().from(scholarCache).limit(1);
    if (rows.length === 0) {
      console.log("[Scholar Cache] Seeding with known-good data...");
      await db.insert(scholarCache).values({
        totalCitations: SEED_TOTAL_CITATIONS,
        publicationsJson: JSON.stringify(SEED_PUBLICATIONS),
        fetchedAt: new Date("2000-01-01T00:00:00Z"), // old date = immediately stale so first real fetch will refresh
      });
    }
  } catch (err) {
    console.error("[Scholar Cache] Failed to seed:", err);
  }
}

// Seed on startup (non-blocking)
ensureSeedData().catch(() => {});

// Background refresh: fetch Scholar and update DB cache, never throws
async function refreshCacheInBackground() {
  try {
    console.log("[Scholar Cache] Background refresh starting...");
    const data = await fetchScholarPublications();
    await saveToCache(data.totalCitations, data.publications);
    console.log(`[Scholar Cache] Refreshed: ${data.publications.length} pubs, ${data.totalCitations} citations`);
  } catch (err) {
    console.warn("[Scholar Cache] Background refresh failed (will use cached data):", (err as Error).message);
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  scholar: router({
    publications: publicProcedure.query(async () => {
      // 1. Always try to serve from DB cache first
      const cached = await getFromCache();

      if (cached) {
        const ageMs = Date.now() - new Date(cached.fetchedAt).getTime();
        const isStale = ageMs > CACHE_TTL_MS;

        // If stale, kick off a background refresh but still return cached data immediately
        if (isStale) {
          refreshCacheInBackground();
        }

        return {
          publications: JSON.parse(cached.publicationsJson),
          totalCitations: cached.totalCitations,
          fromCache: true,
          cacheAgeHours: Math.round(ageMs / 3600000),
        };
      }

      // 2. No cache at all — try live fetch
      try {
        const data = await fetchScholarPublications();
        await saveToCache(data.totalCitations, data.publications);
        return { ...data, fromCache: false, cacheAgeHours: 0 };
      } catch (err) {
        console.error("[Scholar] Live fetch failed and no cache available:", err);
        // 3. Last resort: return seed data inline
        return {
          publications: SEED_PUBLICATIONS,
          totalCitations: SEED_TOTAL_CITATIONS,
          fromCache: true,
          cacheAgeHours: -1,
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
