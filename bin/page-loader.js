#!/usr/bin/env node

import { load } from '../src/loader.js';
import { cwd } from 'process';

console.log(await load('https://page-loader.hexlet.repl.co', cwd()));
