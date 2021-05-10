import axios from 'axios';
import { writeFile, mkdir } from 'fs/promises';
import { URL } from 'url';
import { join, dirname } from 'path';
import cheerio from 'cheerio';

const toFileName = (uri) => {
  const url = new URL(uri);
  return [url.host, url.pathname].join('').replace(/\W/g, '-');
};

const saveToFile = async (filePath, content) => {
  try {
    await writeFile(filePath, content);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    await mkdir(dirname(filePath), { recursive: true });
    await saveToFile(filePath, content);
  }
};

const toResource = (mainUrl, url) => ({
  originUrl: url,
  url: new URL(url, new URL(mainUrl).origin),
  filePath: undefined,
});

const resourceIsLocal = (mainUrl, resource) => resource.url.host.endsWith(new URL(mainUrl).host);

const loadResource = async (mainUrl, resource, path) => {
  const { data: content } = (await axios.get(resource.url.href, { responseType: 'arraybuffer' }));
  const filePath = join(path, `${toFileName(mainUrl)}_files`, toFileName(resource.url.href));
  await saveToFile(filePath, content);
  return { ...resource, filePath };
};

const loadImgs = async (mainUrl, path, content) => {
  const $ = cheerio.load(content);
  const resources = $('img')
    .map((i, el) => $(el).attr('src'))
    .toArray()
    .map((url) => toResource(mainUrl, url))
    .filter((resource) => resourceIsLocal(mainUrl, resource));

  const loadedResources = await Promise.all(resources.map(
    async (resource) => loadResource(mainUrl, resource, path),
  ));
  loadedResources.forEach((resource) => {
    $(`img[src="${resource.originUrl}"]`).attr('src', resource.filePath.replace(path, ''));
  });

  return $.html();
};

const loadScripts = async (mainUrl, path, content) => {
  const $ = cheerio.load(content);
  const resources = $('script')
    .map((i, el) => $(el).attr('src'))
    .toArray()
    .map((url) => toResource(mainUrl, url))
    .filter((resource) => resourceIsLocal(mainUrl, resource));

  const loadedResources = await Promise.all(resources.map(
    async (resource) => loadResource(mainUrl, resource, path),
  ));
  loadedResources.forEach((resource) => {
    $(`script[src="${resource.originUrl}"]`).attr('src', resource.filePath.replace(path, ''));
  });

  return $.html();
};

const loadStyles = async (mainUrl, path, content) => {
  const $ = cheerio.load(content);
  const resources = $('[rel="stylesheet"]')
    .map((i, el) => $(el).attr('href'))
    .toArray()
    .map((url) => toResource(mainUrl, url))
    .filter((resource) => resourceIsLocal(mainUrl, resource));

  const loadedResources = await Promise.all(resources.map(
    async (resource) => loadResource(mainUrl, resource, path),
  ));
  loadedResources.forEach((resource) => {
    $(`[rel="stylesheet"][href="${resource.originUrl}"]`).attr('href', resource.filePath.replace(path, ''));
  });

  return $.html();
};

export default async (url, path) => {
  let { data: content } = await axios.get(url);
  content = await loadImgs(url, path, content);
  content = await loadScripts(url, path, content);
  content = await loadStyles(url, path, content);
  const filePath = `${path}/${toFileName(url)}.html`;
  await saveToFile(filePath, content);
  return filePath;
};
