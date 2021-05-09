#!/usr/bin/env node

import { cwd } from 'process';
import { program } from 'commander';
import load from '../src/loader.js';

program
  .description('Site loader')
  .arguments('<url>')
  .option('--output <v>', 'output path', cwd())
  .action(async (url, options) => {
    const { output } = options;
    console.log(await load(url, output));
  });

(async () => program.parseAsync(process.argv))();
