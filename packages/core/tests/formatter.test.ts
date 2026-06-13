import { describe, it, expect } from 'vitest';
import {
  formatLlmsTxt,
  formatSessionMd,
  formatAgendaMd,
  formatSpeakersMd,
} from '../src/formatter.js';
import type { ParsedData, Session, Speaker, AgendaDay } from '../src/types.js';

const mockSpeaker: Speaker = { name: 'Dylan Field', title: 'CEO & Co-founder', company: 'Figma' };

const mockSession: Session = {
  id: '24762e47-798d-47d7-83fd-7ae7c2d0d412',
  url: 'https://config.figma.com/san-francisco/session/24762e47-798d-47d7-83fd-7ae7c2d0d412/',
  title: 'Figma product launch',
  date: 'Jun 24',
  time: '9:00 – 10:20 AM PDT',
  stage: 'Main stage',
  tags: ['Keynote', 'AI'],
  speakers: [mockSpeaker],
  description: 'Opening keynote by Dylan Field.',
  type: 'session',
};

const mockAgenda: AgendaDay[] = [{ date: 'Jun 24', sessions: [mockSession] }];

const mockData: ParsedData = {
  sessions: [mockSession],
  speakers: [mockSpeaker],
  agenda: mockAgenda,
  event: 'san-francisco',
  scrapedAt: '2026-06-13T00:00:00.000Z',
};

describe('formatLlmsTxt', () => {
  it('starts with # Figma Config 2026', () => {
    expect(formatLlmsTxt(mockData)).toMatch(/^# Figma Config 2026/);
  });

  it('contains session link', () => {
    const out = formatLlmsTxt(mockData);
    expect(out).toContain('Figma product launch');
    expect(out).toContain('24762e47');
  });

  it('contains speaker section', () => {
    expect(formatLlmsTxt(mockData)).toContain('Dylan Field');
  });

  it('contains Optional section', () => {
    expect(formatLlmsTxt(mockData)).toContain('## Optional');
  });
});

describe('formatSessionMd', () => {
  it('starts with session title as h1', () => {
    expect(formatSessionMd(mockSession)).toMatch(/^# Figma product launch/);
  });

  it('includes date, time, stage', () => {
    const md = formatSessionMd(mockSession);
    expect(md).toContain('Jun 24');
    expect(md).toContain('Main stage');
  });

  it('includes tags', () => {
    expect(formatSessionMd(mockSession)).toContain('Keynote');
  });

  it('includes speaker name', () => {
    expect(formatSessionMd(mockSession)).toContain('Dylan Field');
  });

  it('includes source URL', () => {
    expect(formatSessionMd(mockSession)).toContain('https://config.figma.com');
  });
});

describe('formatAgendaMd', () => {
  it('starts with agenda title', () => {
    expect(formatAgendaMd(mockAgenda)).toMatch(/^# Figma Config 2026 — Full Agenda/);
  });

  it('contains GFM table row for session', () => {
    const md = formatAgendaMd(mockAgenda);
    expect(md).toContain('Figma product launch');
    expect(md).toContain('|');
  });
});

describe('formatSpeakersMd', () => {
  it('deduplicates speakers', () => {
    const doubled: Speaker[] = [mockSpeaker, mockSpeaker];
    const md = formatSpeakersMd(doubled);
    const count = (md.match(/## Dylan Field/g) ?? []).length;
    expect(count).toBe(1);
  });
});
