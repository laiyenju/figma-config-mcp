import { Command } from 'commander';
import ora from 'ora';
import { mkdir } from 'node:fs/promises';
import {
  fetchSitemap,
  scrapeAll,
  parseSessionPage,
  parseAgendaPage,
  parseSpeakersPage,
  classifyUrl,
  writeOutput,
  setCached,
} from '@figma-config/core';
import type { ParsedData, Session, Speaker, AgendaDay } from '@figma-config/core';

const program = new Command();

program
  .name('figma-config-llms-txt')
  .description('Convert Figma Config 2026 to LLM-friendly Markdown and llms.txt')
  .version('1.0.0')
  .option('--event <name>', 'Event slug', 'san-francisco')
  .option('--output <dir>', 'Output directory', './figma-config-output')
  .option('--only <types>', 'Only process types: sessions,events,speakers,faq', '')
  .option('--delay <ms>', 'Request delay in ms', '1000')
  .option('--cache-only', 'Use cache only, no network requests')
  .option('--refresh', 'Ignore cache and re-scrape')
  .option('--no-full', 'Skip llms-full.txt output')
  .option('--format <fmt>', 'Output format: markdown|json|both', 'both')
  .option('--verbose', 'Show detailed logs')
  .parse();

const opts = program.opts<{
  event: string;
  output: string;
  only: string;
  delay: string;
  cacheOnly: boolean;
  refresh: boolean;
  full: boolean;
  format: string;
  verbose: boolean;
}>();

async function run(): Promise<void> {
  const spinner = ora('Fetching sitemap...').start();

  try {
    await mkdir(opts.output, { recursive: true });

    const allUrls = await fetchSitemap(opts.event);
    const only = opts.only ? opts.only.split(',').map(s => s.trim()) : [];
    const urls = only.length
      ? allUrls.filter(url => only.some(t => url.includes(`/${t}`)))
      : allUrls;

    spinner.succeed(`Found ${urls.length} URLs`);

    spinner.start(`Scraping... 0/${urls.length}`);
    const htmlMap = await scrapeAll(
      urls,
      {
        delay: parseInt(opts.delay, 10),
        cacheOnly: opts.cacheOnly,
        refresh: opts.refresh,
      },
      (url, i, total) => {
        spinner.text = opts.verbose
          ? `[${i + 1}/${total}] ${url}`
          : `Scraping... ${i + 1}/${total}`;
      },
    );
    spinner.succeed(`Scraped ${htmlMap.size} pages`);

    spinner.start('Parsing...');
    const sessions: Session[] = [];
    const speakers: Speaker[] = [];
    let agenda: AgendaDay[] = [];

    for (const [url, html] of htmlMap) {
      const type = classifyUrl(url);
      if (type === 'session' || type === 'event') {
        sessions.push(parseSessionPage(html, url));
      } else if (type === 'agenda') {
        agenda = parseAgendaPage(html);
      } else if (type === 'speakers') {
        speakers.push(...parseSpeakersPage(html));
      }
    }

    // Reconstruct agenda from sessions if dedicated agenda page was empty
    if (agenda.length === 0 && sessions.length > 0) {
      const dayMap = new Map<string, Session[]>();
      for (const s of sessions) {
        const list = dayMap.get(s.date) ?? [];
        list.push(s);
        dayMap.set(s.date, list);
      }
      agenda = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, daySessions]) => ({ date, sessions: daySessions }));
    }

    spinner.succeed(`Parsed ${sessions.length} sessions, ${speakers.length} speakers`);

    spinner.start('Writing output...');
    const data: ParsedData = {
      sessions,
      speakers,
      agenda,
      event: opts.event,
      scrapedAt: new Date().toISOString(),
    };

    await writeOutput(data, opts.output);
    await setCached('data.json', JSON.stringify(data));
    spinner.succeed(`Done → ${opts.output}`);
  } catch (err) {
    spinner.fail(String(err));
    process.exit(1);
  }
}

run();
