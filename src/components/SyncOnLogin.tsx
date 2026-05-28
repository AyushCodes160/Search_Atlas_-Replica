"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { readHistory, clearHistory } from "@/lib/auditContext";

const KEYWORD_LISTS_KEY = "seo-engine:keyword-lists";
const CRAWL_STORE = "seo-engine:site-crawls";

type LocalKeywordList = { seed: string; data: unknown };
type LocalCrawl = {
  origin: string;
  pages: number;
  mode: "fast" | "deep";
  healthScore: number | null;
  summary: string | null;
};

async function postOk(url: string, body: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function readLocalKeywordLists(): LocalKeywordList[] {
  try {
    const raw = localStorage.getItem(KEYWORD_LISTS_KEY);
    return raw ? (JSON.parse(raw) as LocalKeywordList[]) : [];
  } catch {
    return [];
  }
}

function readLocalCrawls(): LocalCrawl[] {
  try {
    const raw = localStorage.getItem(CRAWL_STORE);
    return raw ? (JSON.parse(raw) as LocalCrawl[]) : [];
  } catch {
    return [];
  }
}

// On first sign-in, migrate any anonymous localStorage data up to the account.
// Each local store is cleared only after its uploads all succeed, so a failed
// request never drops the local copy. Cloud is the source of truth once signed in.
export function SyncOnLogin() {
  const { status } = useSession();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || ran.current) return;
    ran.current = true;

    (async () => {
      const audits = readHistory();
      const lists = readLocalKeywordLists();
      const crawls = readLocalCrawls();
      if (audits.length === 0 && lists.length === 0 && crawls.length === 0) return;

      if (audits.length > 0) {
        const results = await Promise.all(audits.map((a) => postOk("/api/me/audits", a)));
        if (results.every(Boolean)) clearHistory();
      }

      if (lists.length > 0) {
        const results = await Promise.all(
          lists.map((l) => postOk("/api/me/keyword-lists", { seed: l.seed, data: l.data })),
        );
        if (results.every(Boolean)) {
          try {
            localStorage.removeItem(KEYWORD_LISTS_KEY);
          } catch {
            /* ignore */
          }
        }
      }

      if (crawls.length > 0) {
        const results = await Promise.all(
          crawls.map((c) =>
            postOk("/api/me/crawls", {
              origin: c.origin,
              pages: c.pages,
              mode: c.mode,
              healthScore: c.healthScore,
              summary: c.summary,
              data: {},
            }),
          ),
        );
        if (results.every(Boolean)) {
          try {
            localStorage.removeItem(CRAWL_STORE);
          } catch {
            /* ignore */
          }
        }
      }
    })();
  }, [status]);

  return null;
}
