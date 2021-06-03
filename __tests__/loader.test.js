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

const resources = ['/courses', '/assets/professions/nodejs.png', '/script.js', '/assets/application.css'];
let resourcesInfo = [];
let path;
beforeEach(async () => {
  nock.disableNetConnect();
  path = await mkdtemp(join(tmpdir(), 'page-loader-'));
  resourcesInfo = [
    {
      resource: '/courses',
      filePath: 'courses.html',
      content: await readFixture('site.html', 'utf-8'),
    },
    {
      resource: '/assets/professions/nodejs.png',
      filePath: 'assets-professions-nodejs.png',
      content: await readFixture('img.png'),
    },
    {
      resource: '/script.js',
      filePath: 'script.js',
      content: await readFixture('script.js', 'utf-8'),
    },
    {
      resource: '/assets/application.css',
      filePath: 'assets-application.css',
      content: await readFixture('application.css', 'utf-8'),
    },
  ];

  nock('https://site.com').get('/path').reply(200, await readFixture('site.html', 'utf-8'));
  resourcesInfo.forEach(({ resource, content }) => nock('https://site.com').get(resource).reply(200, content));
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

test('load and transform main html', async () => {
  const loadedHtml = await readFixture('loaded-site.html', 'utf-8');
  const result = await load('https://site.com/path', path);
  expect(result).toEqual(join(path, 'site-com-path.html'));
  expect(await readFile(result, 'utf-8')).toEqual(loadedHtml);
});

test.each(resources)('resource %s', async (resource) => {
  await load('https://site.com/path', path);
  const { filePath } = resourcesInfo.find((resourceInfo) => resourceInfo.resource === resource);
  expect(existsSync(join(path, `site-com-path_files/site-com-${filePath}`))).toBeTruthy();
});
