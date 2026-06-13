import Fuse from 'fuse.js';
import type { ParsedData, Session, AgendaDay } from '@figma-config/core';

const MAX_RESPONSE_TOKENS = 8000;

// Rough token estimate: 1 token ≈ 4 chars
function approxTokens(s: string): number {
  return Math.ceil(s.length / 4);
}

function truncateIfNeeded(content: string, hint: string): string {
  if (approxTokens(content) <= MAX_RESPONSE_TOKENS) return content;
  const limit = MAX_RESPONSE_TOKENS * 4;
  return content.slice(0, limit) + `\n\n_[Truncated — ${hint}]_`;
}

function sessionToMd(s: Session): string {
  const speakers = s.speakers.map(sp => {
    const role = [sp.title, sp.company].filter(Boolean).join(', ');
    return `- ${sp.name}${role ? ` — ${role}` : ''}`;
  }).join('\n');

  return [
    `# ${s.title}`,
    `**Date:** ${s.date} · ${s.time}`,
    `**Stage:** ${s.stage}`,
    s.tags.length ? `**Tags:** ${s.tags.join(', ')}` : '',
    speakers ? `\n## Speakers\n${speakers}` : '',
    s.description ? `\n## Description\n\n${s.description}` : '',
    `\n**Link:** ${s.url}`,
  ].filter(Boolean).join('\n');
}

// Tool: get_agenda
export interface GetAgendaInput {
  date?: 'june-23' | 'june-24' | 'june-25';
  tag?: string;
  stage?: string;
  format?: 'markdown' | 'json';
}

export function getAgenda(data: ParsedData, input: GetAgendaInput): string {
  const { date, tag, stage, format = 'markdown' } = input;

  let days: AgendaDay[] = data.agenda;

  if (date) {
    const dateMap: Record<string, string[]> = {
      'june-23': ['Jun 23', 'June 23'],
      'june-24': ['Jun 24', 'June 24'],
      'june-25': ['Jun 25', 'June 25'],
    };
    const patterns = dateMap[date] ?? [];
    days = days.filter(d => patterns.some(p => d.date.includes(p)));
  }

  let sessions = days.flatMap(d => d.sessions);

  if (tag) {
    const tagLower = tag.toLowerCase();
    sessions = sessions.filter(s =>
      s.tags.some(t => t.toLowerCase().includes(tagLower)) ||
      s.title.toLowerCase().includes(tagLower)
    );
  }

  if (stage) {
    const stageLower = stage.toLowerCase();
    sessions = sessions.filter(s => s.stage.toLowerCase().includes(stageLower));
  }

  if (format === 'json') {
    return JSON.stringify(sessions, null, 2);
  }

  if (sessions.length === 0) return 'No sessions found matching the given filters.';

  // Group back by date for markdown output
  const grouped = new Map<string, Session[]>();
  for (const s of sessions) {
    const list = grouped.get(s.date) ?? [];
    list.push(s);
    grouped.set(s.date, list);
  }

  const lines: string[] = [];
  for (const [d, daySessions] of grouped) {
    lines.push(`## ${d}`, '');
    lines.push('| Time | Session | Stage | Speakers |');
    lines.push('|---|---|---|---|');
    for (const s of daySessions) {
      const spNames = s.speakers.map(sp => sp.name).join(', ');
      lines.push(`| ${s.time} | ${s.title} | ${s.stage} | ${spNames} |`);
    }
    lines.push('');
  }

  return truncateIfNeeded(lines.join('\n'), 'use --date or --tag to narrow results');
}

// Tool: get_session
export interface GetSessionInput {
  id?: string;
  title?: string;
}

export function getSession(data: ParsedData, input: GetSessionInput): string {
  const { id, title } = input;

  if (!id && !title) return 'Provide either `id` or `title` to look up a session.';

  let session: Session | undefined;

  if (id) {
    session = data.sessions.find(s => s.id === id);
  } else if (title) {
    const fuse = new Fuse(data.sessions, { keys: ['title'], threshold: 0.4 });
    session = fuse.search(title)[0]?.item;
  }

  if (!session) return `Session not found: ${id ?? title}`;
  return sessionToMd(session);
}

// Tool: get_speakers
export interface GetSpeakersInput {
  name?: string;
  company?: string;
  limit?: number;
}

export function getSpeakers(data: ParsedData, input: GetSpeakersInput): string {
  const { name, company, limit = 20 } = input;

  let speakers = data.speakers;

  // Deduplicate
  const seen = new Set<string>();
  speakers = speakers.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });

  if (name) {
    const fuse = new Fuse(speakers, { keys: ['name'], threshold: 0.4 });
    speakers = fuse.search(name).map(r => r.item);
  }

  if (company) {
    const compLower = company.toLowerCase();
    speakers = speakers.filter(s => s.company.toLowerCase().includes(compLower));
  }

  speakers = speakers.slice(0, limit);

  if (speakers.length === 0) return 'No speakers found matching the given filters.';

  const lines = ['## Speakers', ''];
  for (const s of speakers) {
    const role = [s.title, s.company].filter(Boolean).join(', ');
    const sessions = data.sessions
      .filter(sess => sess.speakers.some(sp => sp.name === s.name))
      .map(sess => `${sess.title} (${sess.date}, ${sess.stage})`)
      .join('; ');
    lines.push(`- **${s.name}**${role ? ` — ${role}` : ''}`);
    if (sessions) lines.push(`  Sessions: ${sessions}`);
  }

  return lines.join('\n');
}

// Tool: search_sessions
export interface SearchSessionsInput {
  query: string;
  limit?: number;
}

export function searchSessions(data: ParsedData, input: SearchSessionsInput): string {
  const { query, limit = 10 } = input;

  const fuse = new Fuse(data.sessions, {
    keys: ['title', 'description', 'tags', 'speakers.name'],
    threshold: 0.4,
    includeScore: true,
  });

  const results = fuse.search(query, { limit }).map(r => r.item);

  if (results.length === 0) return `No sessions found for query: "${query}"`;

  const lines = [`搜尋「${query}」找到 ${results.length} 個結果：`, ''];
  results.forEach((s, i) => {
    const speakers = s.speakers.map(sp => sp.name).join(', ');
    lines.push(`${i + 1}. **${s.title}** (${s.date}, ${s.stage})`);
    if (s.tags.length) lines.push(`   Tags: ${s.tags.join(', ')}`);
    if (speakers) lines.push(`   Speakers: ${speakers}`);
    if (s.description) lines.push(`   ${s.description.slice(0, 120)}...`);
    lines.push('');
  });

  return truncateIfNeeded(lines.join('\n'), 'narrow your query for more specific results');
}

// Tool: get_event_summary
export function getEventSummary(data: ParsedData): string {
  const totalSessions = data.sessions.length;
  const uniqueSpeakers = new Set(
    data.sessions.flatMap(s => s.speakers.map(sp => sp.name))
  ).size;

  const highlights = data.agenda.map(day => {
    const keynote = day.sessions.find(s => s.tags.includes('Keynote'));
    return `- ${day.date}: ${keynote ? keynote.title : day.sessions[0]?.title ?? '—'}`;
  });

  return [
    '# Figma Config 2026 — 活動總覽',
    '',
    '- **地點：** Moscone Center, San Francisco',
    '- **日期：** June 23–25, 2026',
    `- **場次數量：** ${totalSessions}+ sessions`,
    `- **講者人數：** ${uniqueSpeakers}+ speakers`,
    '- **場地：** Main Stage · Mezzanine Stage · Config Commons',
    '',
    '## 議程亮點',
    ...highlights,
    '',
    '## 連結',
    `- 官網：https://config.figma.com`,
    `- 完整議程：https://config.figma.com/${data.event}/agenda/`,
    '',
    `_資料擷取時間：${data.scrapedAt}_`,
  ].join('\n');
}
