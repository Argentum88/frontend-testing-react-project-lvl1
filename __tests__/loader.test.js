import { mkdtemp, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import axios from 'axios';
import http from 'axios/lib/adapters/http';
import nock from 'nock';
import load from '../src/loader.js';

axios.defaults.adapter = http;

const readFixture = async (name) => readFile(join(__dirname, '..', '__fixtures__', name), 'utf-8');

beforeEach(async () => {
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('positive cases', () => {
  const resources = ['img.png', 'script.js', 'application.css'];
  let path;
  beforeEach(async () => {
    path = await mkdtemp(join(tmpdir(), 'page-loader-'));

    nock('https://site.com').get('/path').reply(200, await readFixture('site.html'));
    for (let resource of resources) {
      nock('https://site.com').get(`/${resource}`).reply(200, await readFixture(resource));
    }
  });

  test('load and transform main html', async () => {
    const loadedHtml = await readFixture('loaded-site.html');
    const result = await load('https://site.com/path', path);
    expect(result).toEqual(join(path, 'site-com-path.html'));
    expect(await readFile(result, 'utf-8')).toEqual(loadedHtml);
  });

  test.each(resources)('resource %s', async (resource) => {
    await load('https://site.com/path', path);
    expect(existsSync(join(path, `site-com-path_files/site-com-${resource}`))).toBeTruthy();
  });
});

describe('negative cases', () => {
  test.each([404, 500])('server %s error', (code) => {
    nock('https://site.com').get('/path').reply(code);
    return expect(load('https://site.com/path')).rejects.toThrow();
  });

  test('access error', async () => {
    const html = await readFixture('simple-site.html');
    nock('https://site.com').get('/path').reply(200, html);
    return expect(load('https://site.com/path', '/sys')).rejects.toThrow();
  });
});
