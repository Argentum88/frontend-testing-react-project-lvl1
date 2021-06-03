import { readFile } from 'fs/promises';
import { join } from 'path';
import axios from 'axios';
import http from 'axios/lib/adapters/http';
import nock from 'nock';
import load from '../src/loader.js';

axios.defaults.adapter = http;

const readFixture = async (name, encoding = null) => readFile(join(__dirname, '..', '__fixtures__', name), encoding);
beforeEach(async () => {
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
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
