import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseSessionPage, parseAgendaPage, parseSpeakersPage, classifyUrl } from '../src/parser.js';

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf-8');

describe('parseSessionPage', () => {
  const SESSION_URL =
    'https://config.figma.com/san-francisco/session/07a28549-f6a7-4621-8dca-504608ad449b/';

  it('extracts title', () => {
    const s = parseSessionPage(fixture('session.html'), SESSION_URL);
    expect(s.title).toBe('Figma deep dive');
  });

  it('extracts date and time', () => {
    const s = parseSessionPage(fixture('session.html'), SESSION_URL);
    expect(s.date).toMatch(/Jun\s+25/i);
    expect(s.time).toMatch(/2:15/);
  });

  it('extracts tags', () => {
    const s = parseSessionPage(fixture('session.html'), SESSION_URL);
    expect(s.tags).toContain('Figma');
  });

  it('extracts speaker name and role', () => {
    const s = parseSessionPage(fixture('session.html'), SESSION_URL);
    expect(s.speakers[0]?.name).toBe('Jake Albaugh');
    expect(s.speakers[0]?.company).toBe('Figma');
  });

  it('extracts description', () => {
    const s = parseSessionPage(fixture('session.html'), SESSION_URL);
    expect(s.description).toMatch(/deep dive/i);
  });

  it('sets correct id from URL', () => {
    const s = parseSessionPage(fixture('session.html'), SESSION_URL);
    expect(s.id).toBe('07a28549-f6a7-4621-8dca-504608ad449b');
  });

  it('sets type as session', () => {
    const s = parseSessionPage(fixture('session.html'), SESSION_URL);
    expect(s.type).toBe('session');
  });
});

describe('parseAgendaPage', () => {
  it('returns agenda days sorted by date', () => {
    const days = parseAgendaPage(fixture('agenda.html'));
    expect(days.length).toBeGreaterThan(0);
    expect(days[0]?.date).toBeTruthy();
  });

  it('extracts session titles', () => {
    const days = parseAgendaPage(fixture('agenda.html'));
    const titles = days.flatMap(d => d.sessions.map(s => s.title));
    expect(titles).toContain('Figma product launch');
    expect(titles).toContain('Figma deep dive');
  });

  it('extracts tags from session cards', () => {
    const days = parseAgendaPage(fixture('agenda.html'));
    const session = days.flatMap(d => d.sessions).find(s => s.title === 'Figma product launch');
    expect(session?.tags).toContain('Keynote');
  });
});

describe('parseSpeakersPage', () => {
  it('returns speakers list', () => {
    const speakers = parseSpeakersPage(fixture('speakers.html'));
    expect(speakers.length).toBe(2);
  });

  it('extracts name and company', () => {
    const speakers = parseSpeakersPage(fixture('speakers.html'));
    const dylan = speakers.find(s => s.name === 'Dylan Field');
    expect(dylan?.company).toBe('Figma');
  });
});

describe('classifyUrl', () => {
  it.each([
    ['https://config.figma.com/san-francisco/session/abc/', 'session'],
    ['https://config.figma.com/san-francisco/event/abc/', 'event'],
    ['https://config.figma.com/san-francisco/agenda/', 'agenda'],
    ['https://config.figma.com/san-francisco/speakers/', 'speakers'],
    ['https://config.figma.com/san-francisco/faq/', 'faq'],
    ['https://config.figma.com/san-francisco/sponsors/', 'sponsors'],
    ['https://config.figma.com/san-francisco/', 'unknown'],
  ])('%s → %s', (url, expected) => {
    expect(classifyUrl(url)).toBe(expected);
  });
});
