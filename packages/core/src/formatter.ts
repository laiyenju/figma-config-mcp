import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ParsedData, Session, Speaker, AgendaDay } from './types.js';

const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-' });
td.use(gfm);

function speakerAnchor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function deduplicateSpeakers(speakers: Speaker[]): Speaker[] {
  const seen = new Set<string>();
  return speakers.filter(s => {
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  });
}

export function formatLlmsTxt(data: ParsedData): string {
  const lines: string[] = [
    '# Figma Config 2026',
    '',
    "> Figma's annual design & development conference.",
    '> San Francisco, Moscone Center, June 23–25, 2026.',
    '> 3 days · 90+ sessions · Main Stage + Mezzanine Stage',
    '',
    '## Agenda Overview',
    `- [Full Agenda](https://config.figma.com/${data.event}/agenda/): Browse all sessions by day and filter by topic`,
    '',
  ];

  for (const day of data.agenda) {
    lines.push(`## Sessions — ${day.date}`);
    for (const s of day.sessions) {
      const speakerStr = s.speakers.map(sp => sp.name).join(', ');
      const meta = [s.time, s.stage, speakerStr].filter(Boolean).join(' · ');
      lines.push(`- [${s.title}](./sessions/${s.id}.md): ${meta}`);
    }
    lines.push('');
  }

  const uniqueSpeakers = deduplicateSpeakers(data.speakers);
  if (uniqueSpeakers.length > 0) {
    lines.push('## Speakers');
    for (const s of uniqueSpeakers) {
      const role = [s.title, s.company].filter(Boolean).join(', ');
      lines.push(`- [${s.name}](./speakers.md#${speakerAnchor(s.name)})${role ? `: ${role}` : ''}`);
    }
    lines.push('');
  }

  lines.push(
    '## Optional',
    `- [Sponsors](https://config.figma.com/${data.event}/sponsors/): Event sponsors`,
    `- [FAQ](https://config.figma.com/${data.event}/faq/): Frequently asked questions`,
  );

  return lines.join('\n');
}

export function formatSessionMd(session: Session): string {
  const lines: string[] = [
    `# ${session.title}`,
    '',
    `**Date:** ${session.date} · ${session.time}`,
    `**Stage:** ${session.stage}`,
  ];

  if (session.tags.length > 0) {
    lines.push(`**Tags:** ${session.tags.join(', ')}`);
  }

  if (session.speakers.length > 0) {
    lines.push('', '## Speakers');
    for (const s of session.speakers) {
      const role = [s.title, s.company].filter(Boolean).join(', ');
      lines.push(`- ${s.name}${role ? ` — ${role}` : ''}`);
    }
  }

  if (session.description) {
    lines.push('', '## Description', '', td.turndown(session.description));
  }

  lines.push('', `**Link:** ${session.url}`);
  return lines.join('\n');
}

export function formatAgendaMd(agenda: AgendaDay[]): string {
  const lines: string[] = ['# Figma Config 2026 — Full Agenda', ''];

  for (const day of agenda) {
    lines.push(`## ${day.date}`, '');
    lines.push('| Time | Session | Stage | Speakers |');
    lines.push('|---|---|---|---|');
    for (const s of day.sessions) {
      const speakers = s.speakers.map(sp => sp.name).join(', ');
      lines.push(`| ${s.time} | [${s.title}](./sessions/${s.id}.md) | ${s.stage} | ${speakers} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function formatSpeakersMd(speakers: Speaker[]): string {
  const lines: string[] = ['# Figma Config 2026 — Speakers', ''];

  for (const s of deduplicateSpeakers(speakers)) {
    const role = [s.title, s.company].filter(Boolean).join(', ');
    lines.push(`## ${s.name}`);
    if (role) lines.push(`**Role:** ${role}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function formatLlmsFullTxt(data: ParsedData): string {
  const parts: string[] = [formatLlmsTxt(data), ''];

  for (const day of data.agenda) {
    for (const s of day.sessions) {
      parts.push(formatSessionMd(s), '---', '');
    }
  }

  return parts.join('\n');
}

export async function writeOutput(data: ParsedData, outputDir: string): Promise<void> {
  const sessionsDir = join(outputDir, 'sessions');
  await mkdir(sessionsDir, { recursive: true });

  await Promise.all([
    writeFile(join(outputDir, 'llms.txt'), formatLlmsTxt(data), 'utf-8'),
    writeFile(join(outputDir, 'llms-full.txt'), formatLlmsFullTxt(data), 'utf-8'),
    writeFile(join(outputDir, 'agenda.md'), formatAgendaMd(data.agenda), 'utf-8'),
    writeFile(join(outputDir, 'speakers.md'), formatSpeakersMd(data.speakers), 'utf-8'),
    writeFile(join(outputDir, 'data.json'), JSON.stringify(data, null, 2), 'utf-8'),
    ...data.sessions
      .filter(s => s.id)
      .map(s => writeFile(join(sessionsDir, `${s.id}.md`), formatSessionMd(s), 'utf-8')),
  ]);
}
