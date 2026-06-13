import { fetchSitemap, scrapeAll } from './scraper.js';
import { parseSessionPage, parseSpeakersPage, classifyUrl } from './parser.js';
import type { ParsedData, Session, Speaker } from './types.js';
import type { ScrapeOptions, ProgressCallback } from './scraper.js';

export async function buildData(
  event: string,
  opts?: ScrapeOptions,
  onProgress?: ProgressCallback,
): Promise<ParsedData> {
  const allUrls = await fetchSitemap(event);
  const urls =
    opts?.only?.length
      ? allUrls.filter(url => opts.only!.some(t => url.includes(`/${t}`)))
      : allUrls;
  const htmlMap = await scrapeAll(urls, opts, onProgress);

  const sessions: Session[] = [];
  const speakers: Speaker[] = [];

  for (const [url, html] of htmlMap) {
    const type = classifyUrl(url);
    if (type === 'session' || type === 'event') {
      sessions.push(parseSessionPage(html, url));
    } else if (type === 'speakers') {
      speakers.push(...parseSpeakersPage(html));
    }
  }

  // Agenda page SSR is incomplete — always rebuild from individual session pages
  const dayMap = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = dayMap.get(s.date) ?? [];
    list.push(s);
    dayMap.set(s.date, list);
  }
  const agenda = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySessions]) => ({ date, sessions: daySessions }));

  // Speakers page SSR is incomplete — merge from individual session pages
  const speakerMap = new Map<string, Speaker>();
  for (const sp of speakers) speakerMap.set(sp.name, sp);
  for (const s of sessions) {
    for (const sp of s.speakers) {
      if (!speakerMap.has(sp.name)) speakerMap.set(sp.name, sp);
    }
  }

  return {
    sessions,
    speakers: Array.from(speakerMap.values()),
    agenda,
    event,
    scrapedAt: new Date().toISOString(),
  };
}
