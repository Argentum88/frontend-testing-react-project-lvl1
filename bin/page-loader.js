#!/usr/bin/env node

import pkg from 'commander';
import { cwd } from 'process';
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

const { program } = pkg;
program
  .description('Site loader')
  .arguments('<url>')
  .option('-o, --output <v>', 'output path', cwd())
  .action(main);

(async () => program.parseAsync(process.argv))();
