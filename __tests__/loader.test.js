import { mkdtemp, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import http from 'axios/lib/adapters/http';
import nock from 'nock';
import load from '../src/loader.js';

axios.defaults.adapter = http;

const readFixture = async (name, encoding = null) => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return readFile(join(__dirname, '..', '__fixtures__', name), encoding);
};

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
  const html = await readFixture('site.html', 'utf-8');
  const img = await readFixture('img.png');
  const script = await readFixture('script.js', 'utf-8');
  const css = await readFixture('application.css', 'utf-8');
  nock('https://site.com').get('/path').reply(200, html);
  nock('https://site.com').get('/courses').reply(200, html);
  nock('https://site.com').get('/assets/professions/nodejs.png').times(2).reply(200, img);
  nock('https://site.com').get('/script.js').reply(200, script);
  nock('https://site.com').get('/assets/application.css').reply(200, css);

  const loadedHtml = await readFixture('loaded-site.html', 'utf-8');
  const result = await load('https://site.com/path', path);
  expect(result).toEqual(join(path, 'site-com-path.html'));
  expect(await readFile(result, 'utf-8')).toEqual(loadedHtml);
  expect(existsSync(join(path, 'site-com-path_files/site-com-assets-professions-nodejs.png'))).toBeTruthy();
  expect(existsSync(join(path, 'site-com-path_files/site-com-script.js'))).toBeTruthy();
  expect(existsSync(join(path, 'site-com-path_files/site-com-assets-application.css'))).toBeTruthy();
});
