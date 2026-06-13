import { Command } from 'commander';
import ora from 'ora';
import { mkdir } from 'node:fs/promises';
import { buildData, writeOutput, setCached } from '@figma-config/core';

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

    spinner.start('Scraping...');
    const data = await buildData(
      opts.event,
      {
        delay: parseInt(opts.delay, 10),
        cacheOnly: opts.cacheOnly,
        refresh: opts.refresh,
        only: opts.only ? opts.only.split(',').map(s => s.trim()) : undefined,
      },
      (url, i, total) => {
        spinner.text = opts.verbose
          ? `[${i + 1}/${total}] ${url}`
          : `Scraping... ${i + 1}/${total}`;
      },
    );

    spinner.succeed(`Parsed ${data.sessions.length} sessions, ${data.speakers.length} speakers`);

    spinner.start('Writing output...');
    await writeOutput(data, opts.output);
    await setCached('data.json', JSON.stringify(data));
    spinner.succeed(`Done → ${opts.output}`);
  } catch (err) {
    spinner.fail(String(err));
    process.exit(1);
  }
}

run();
