#!/usr/bin/env node

import { program } from 'commander';
import load from '../src/loader.js';

const main = async (url, options) => {
  try {
    const { output } = options;
    console.log(await load(url, output));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
};

program
  .description('Site loader')
  .arguments('<url>')
  .option('--output <v>', 'output path')
  .action(main);

(async () => program.parseAsync(process.argv))();
