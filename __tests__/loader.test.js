import { mkdtemp, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import axios from 'axios';
import http from 'axios/lib/adapters/http';
import nock from 'nock';
import load from '../src/loader.js';

axios.defaults.adapter = http;

const readFixture = async (name, encoding = null) => readFile(join(__dirname, '..', '__fixtures__', name), encoding);

let path;
beforeEach(async () => {
  nock.disableNetConnect();
  path = await mkdtemp(join(tmpdir(), 'page-loader-'));
});

let resources = [];
beforeAll(async () => {
  console.log('before')
  resources = [
    {
      resourcePath: '/courses',
      file: 'courses.html',
      content: await readFixture('site.html', 'utf-8'),
    },
    {
      resourcePath: '/assets/professions/nodejs.png',
      file: 'assets-professions-nodejs.png',
      content: await readFixture('img.png'),
    },
    {
      resourcePath: '/script.js',
      file: 'script.js',
      content: await readFixture('script.js', 'utf-8'),
    },
    {
      resourcePath: '/assets/application.css',
      file: 'assets-application.css',
      content: await readFixture('application.css', 'utf-8'),
    },
  ];

  let a = 5;
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
  expect(existsSync(join(path, 'site-com-path.html'))).toBeTruthy();
  expect(existsSync(join(path, 'site-com-path_files/site-com-courses.html'))).toBeTruthy();
  expect(existsSync(join(path, 'site-com-path_files/site-com-assets-professions-nodejs.png'))).toBeTruthy();
  expect(existsSync(join(path, 'site-com-path_files/site-com-script.js'))).toBeTruthy();
  expect(existsSync(join(path, 'site-com-path_files/site-com-assets-application.css'))).toBeTruthy();
});

test.each((() => {console.log('each'); return []})()/*resources*/)('%o', async ({ file }) => {
  resources.forEach(({ resourcePath, content }) => nock('https://site.com').get(resourcePath).reply(200, content));
  const html = await readFixture('site.html', 'utf-8');
  nock('https://site.com').get('/path').reply(200, html);
  await load('https://site.com/path', path);
  expect(existsSync(join(path, `site-com-path_files/site-com-${file}`))).toBeTruthy();
});

test('server error', () => {
  nock('https://site.com').get('/path').reply(500);
  return expect(load('https://site.com/path')).rejects.toThrow();
});

test('access error', async () => {
  const html = await readFixture('simple-site.html', 'utf-8');
  nock('https://site.com').get('/path').reply(200, html);
  return expect(load('https://site.com/path', '/sys')).rejects.toThrow();
});
