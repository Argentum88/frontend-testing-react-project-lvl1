import { mkdtemp, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  nock('https://page-loader.hexlet.repl.co').get('/').reply(200, html);

  expect(await readFile(await load('https://page-loader.hexlet.repl.co', path), 'utf-8')).toEqual(html);
});
