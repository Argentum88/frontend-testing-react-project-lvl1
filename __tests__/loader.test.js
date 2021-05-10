import { mkdtemp, readFile, access } from 'fs/promises';
import { existsSync } from 'fs'
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath, URL } from 'url';
import axios from 'axios';
import http from 'axios/lib/adapters/http';
import nock from 'nock';

import load from '../src/loader.js';

axios.defaults.adapter = http;
const __dirname = dirname(fileURLToPath(import.meta.url));

let path;
beforeEach(async () => {
  nock.disableNetConnect();
  path = await mkdtemp(join(tmpdir(), 'page-loader-'));
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

test('loader', async () => {
  const html = await readFile(join(__dirname, '..', '__fixtures__', 'site.html'), 'utf-8');
  const img = await readFile(join(__dirname, '..', '__fixtures__', 'img.png'));
  nock('https://page-loader.hexlet.repl.co').get('/path').reply(200, html);
  nock('https://page-loader.hexlet.repl.co').get('/assets/professions/nodejs.png').reply(200, img);

  const loadedHtml = await readFile(join(__dirname, '..', '__fixtures__', 'loaded-site.html'), 'utf-8');
  const result = await load('https://page-loader.hexlet.repl.co/path', path);
  expect(result).toEqual(join(path, 'page-loader-hexlet-repl-co-path.html'));
  expect(await readFile(result, 'utf-8')).toEqual(loadedHtml);
  expect(existsSync(join(path, 'page-loader-hexlet-repl-co-path_files/page-loader-hexlet-repl-co-assets-professions-nodejs-png'))).toBeTruthy();
});
