import axios from 'axios';
import { writeFile, mkdir } from 'fs/promises';
import { URL } from 'url';
import { join, dirname, parse } from 'path';
import cheerio from 'cheerio';
import _ from 'lodash';

const toFileName = (uri) => {
  const url = new URL(uri);
  const { ext } = parse(url.pathname);
  const fileName = [url.host, url.pathname.replace(ext, '')]
    .filter((el) => el !== '/')
    .join('')
    .replace(/\W/g, '-');

  return [fileName, ext].join('');
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
  constructor(url, path) {
    console.log(url);
    this.url = url;
    this.path = path;
  }

  toResource(url) {
    return {
      originUrl: url,
      url: new URL(url, new URL(this.url).origin),
      filePath: undefined,
    };
  }

  resourceIsLocal(resource) {
    const urlHost = new URL(this.url).host.split('.');
    const resourceHost = resource.url.host.split('.');
    return _.isEqual(resourceHost.slice(-urlHost.length), urlHost);
  }

  async doLoadResource(resource) {
    const { data: content } = await axios.get(resource.url.href, { responseType: 'arraybuffer' });
    const filePath = join(this.path, `${toFileName(this.url)}_files`, toFileName(resource.url.href));
    await saveToFile(filePath, content);
    return { ...resource, filePath };
  }

  async loadResource(getResourceUrls, replaceContent) {
    const resources = getResourceUrls()
      .map((url) => this.toResource(url))
      .filter((resource) => this.resourceIsLocal(resource));

    const loadedResources = await Promise.all(resources.map(
      async (resource) => this.doLoadResource(resource),
    ));
    loadedResources.forEach((resource) => replaceContent(resource));
  }
}

export default async (url, path) => {
  const { data: content } = await axios.get(url);
  const $ = cheerio.load(content);
  const loader = new Loader(url, path);

  const imgs = loader.loadResource(
    () => $('img').map((i, el) => $(el).attr('src')).toArray(),
    (resource) => $(`img[src="${resource.originUrl}"]`).attr('src', resource.filePath.replace(path, '')),
  );
  const scripts = loader.loadResource(
    () => $('script').map((i, el) => $(el).attr('src')).toArray(),
    (resource) => $(`script[src="${resource.originUrl}"]`).attr('src', resource.filePath.replace(path, '')),
  );
  const styles = loader.loadResource(
    () => $('[rel="stylesheet"]').map((i, el) => $(el).attr('href')).toArray(),
    (resource) => $(`[rel="stylesheet"][href="${resource.originUrl}"]`).attr('href', resource.filePath.replace(path, '')),
  );

  await Promise.all([imgs, scripts, styles]);

  const filePath = join(path, `${toFileName(url)}.html`);
  await saveToFile(filePath, $.html());
  return filePath;
};
