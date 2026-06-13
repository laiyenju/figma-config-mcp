import { load } from 'cheerio';
import type { Session, Speaker, AgendaDay } from './types.js';

const DATE_RE = /^Jun(?:e)?\s+\d+$/i;

function extractUuid(url: string): string {
  return url.match(/\/(?:session|event)\/([a-f0-9-]{36})\/?/)?.[1] ?? '';
}

function splitRole(roleText: string): { title: string; company: string } {
  const [title = '', company = ''] = roleText.split(',').map(s => s.trim());
  return { title, company };
}

export function parseSessionPage(html: string, url: string): Session {
  const $ = load(html);
  const main = $('main');

  // Session pages use h2 for the title (no h1 in <main>)
  const title = main.find('h2').first().text().trim() || $('h2').first().text().trim();

  // Date is in a <span> with text matching "Jun N" directly
  let date = '';
  main.find('span').each((_, el) => {
    if (date) return;
    const text = $(el).clone().children().remove().end().text().trim();
    if (DATE_RE.test(text)) date = text;
  });

  // Time is split across two <time> elements: start and "end AM/PM TZ"
  const timeEls = main.find('time').map((_, el) => $(el).text().trim()).get();
  const time = timeEls.length >= 2 ? `${timeEls[0]}–${timeEls[1]}` : (timeEls[0] ?? '');

  // Stage via text content — class names are hashed so this is the reliable approach
  let stage = '';
  main.find('*').each((_, el) => {
    if (stage) return;
    const text = $(el).clone().children().remove().end().text().trim();
    if (/stage|hall|mezzanine|level/i.test(text) && text.length < 100) stage = text;
  });

  // Tags: spans labelled "Theme:" or "Topic:" have a sibling span with the value
  const tags: string[] = [];
  main.find('span').each((_, el) => {
    const text = $(el).clone().children().remove().end().text().trim();
    if (/^(Theme|Topic):$/i.test(text)) {
      const tag = $(el).next('span').text().trim();
      if (tag && !tags.includes(tag)) tags.push(tag);
    }
  });

  // Speakers use article[aria-label]; role <p> is a sibling of the article, not inside it
  const speakers: Speaker[] = [];
  main.find('article[aria-label]').each((_, el) => {
    const name = $(el).attr('aria-label')?.trim() ?? '';
    if (!name) return;
    const roleText = $(el).parent().find('p').first().text().trim();
    const profileUrl = $(el).find('a[href*="?speaker"]').attr('href');
    const { title: spTitle, company } = splitRole(roleText);
    speakers.push({ name, title: spTitle, company, profileUrl });
  });

  // Description: longest <p> in main (heuristic; works for SSR content)
  let description = '';
  main.find('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > description.length) description = text;
  });

  return {
    id: extractUuid(url),
    url,
    title,
    date,
    time,
    stage,
    tags,
    speakers,
    description,
    type: url.includes('/event/') ? 'event' : 'session',
  };
}

export function parseAgendaPage(html: string): AgendaDay[] {
  const $ = load(html);
  const dayMap = new Map<string, Session[]>();

  // Agenda page is mostly CSR; SSR only renders featured sessions.
  // article[aria-label] is used for both session cards and nested speaker cards.
  // We filter to only articles that contain a /session/ link.
  $('article[aria-label]').each((_, card) => {
    const href = $(card).find('a[href*="/session/"]').first().attr('href') ?? '';
    if (!href) return;

    const title =
      $(card).attr('aria-label')?.trim() ||
      $(card).find('h3, h2').first().text().trim();
    if (!title) return;

    const url = href.startsWith('http') ? href : `https://config.figma.com${href}`;

    let date = '';
    $(card).find('span').each((_, el) => {
      if (date) return;
      const text = $(el).clone().children().remove().end().text().trim();
      if (DATE_RE.test(text)) date = text;
    });
    date = date || 'Unknown';

    const timeEls = $(card).find('time').map((_, el) => $(el).text().trim()).get();
    const time = timeEls.length >= 2 ? `${timeEls[0]}–${timeEls[1]}` : (timeEls[0] ?? '');

    let stage = '';
    $(card).find('*').each((_, el) => {
      if (stage) return;
      const text = $(el).clone().children().remove().end().text().trim();
      if (/stage|hall|mezzanine|level/i.test(text) && text.length < 100) stage = text;
    });

    const tags: string[] = [];
    $(card).find('span').each((_, el) => {
      const text = $(el).clone().children().remove().end().text().trim();
      if (/^(Theme|Topic):$/i.test(text)) {
        const tag = $(el).next('span').text().trim();
        if (tag && !tags.includes(tag)) tags.push(tag);
      }
    });

    const speakers: Speaker[] = [];
    $(card).find('article[aria-label]').each((_, el) => {
      const name = $(el).attr('aria-label')?.trim() ?? '';
      if (!name) return;
      const roleText = $(el).parent().find('p').first().text().trim();
      const profileUrl = $(el).find('a[href*="?speaker"]').attr('href');
      const { title: spTitle, company } = splitRole(roleText);
      speakers.push({ name, title: spTitle, company, profileUrl });
    });

    const session: Session = {
      id: extractUuid(url),
      url,
      title,
      date,
      time,
      stage,
      tags,
      speakers,
      description: '',
      type: 'session',
    };

    const list = dayMap.get(date) ?? [];
    list.push(session);
    dayMap.set(date, list);
  });

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, sessions]) => ({ date, sessions }));
}

export function parseSpeakersPage(html: string): Speaker[] {
  const $ = load(html);
  const speakers: Speaker[] = [];

  // Speakers page SSR only renders featured speakers (6 items in carousel).
  // Full speaker list is CSR. article[aria-label] is the correct selector.
  // Role <p> is a sibling of the article, not inside it.
  $('article[aria-label]').each((_, card) => {
    const name = $(card).attr('aria-label')?.trim() ?? '';
    if (!name) return;
    const roleText = $(card).parent().find('p').first().text().trim();
    const { title, company } = splitRole(roleText);
    const profileUrl = $(card).find('a[href*="?speaker"]').attr('href');
    speakers.push({ name, title, company, profileUrl });
  });

  return speakers;
}

export type UrlType = 'session' | 'event' | 'agenda' | 'speakers' | 'faq' | 'sponsors' | 'unknown';

export function classifyUrl(url: string): UrlType {
  if (url.includes('/session/')) return 'session';
  if (url.includes('/event/')) return 'event';
  if (url.includes('/agenda/')) return 'agenda';
  if (url.includes('/speakers/')) return 'speakers';
  if (url.includes('/faq/')) return 'faq';
  if (url.includes('/sponsors/')) return 'sponsors';
  return 'unknown';
}
