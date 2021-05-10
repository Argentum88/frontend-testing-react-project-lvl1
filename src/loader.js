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

class Loader {
  constructor (url, path) {
    this.url = url;
    this.path = path
  }

  toResource(url) {
    return {
      originUrl: url,
      url: new URL(url, new URL(this.url).origin),
      filePath: undefined,
    };
  }

  resourceIsLocal(resource) {
    return resource.url.host.endsWith(new URL(this.url).host);
  }

  async doLoadResource(resource) {
    const { data: content } = await axios.get(resource.url.href, { responseType: 'arraybuffer' });
    const filePath = join(this.path, `${toFileName(this.url)}_files`, toFileName(resource.url.href));
    await saveToFile(filePath, content);
    return { ...resource, filePath };
  }

  async loadResource(getRawResource, replaceContent) {
    const resources = getRawResource()
      .toArray()
      .map((url) => this.toResource(url))
      .filter((resource) => this.resourceIsLocal(resource));

    const loadedResources = await Promise.all(resources.map(
      async (resource) => this.doLoadResource(resource),
    ));
    loadedResources.forEach((resource) => replaceContent(resource));
  }
}

export default async (url, path) => {
  let { data: content } = await axios.get(url);
  const $ = cheerio.load(content);
  const loader = new Loader(url, path);

  const imgs = loader.loadResource(
    () => $('img').map((i, el) => $(el).attr('src')),
    (resource) => $(`img[src="${resource.originUrl}"]`).attr('src', resource.filePath.replace(path, '')),
  );
  const scripts = loader.loadResource(
    () => $('script').map((i, el) => $(el).attr('src')),
    (resource) => $(`script[src="${resource.originUrl}"]`).attr('src', resource.filePath.replace(path, '')),
  );
  const styles = loader.loadResource(
    () => $('[rel="stylesheet"]').map((i, el) => $(el).attr('href')),
    (resource) => $(`[rel="stylesheet"][href="${resource.originUrl}"]`).attr('href', resource.filePath.replace(path, '')),
  );

  await Promise.all([imgs, scripts, styles]);

  const filePath = `${path}/${toFileName(url)}.html`;
  await saveToFile(filePath, $.html());
  return filePath;
};