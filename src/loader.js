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

const loadImg = async (url, path, content) => {
  const $ = cheerio.load(content);
  const imgResources = $('img')
    .map((i, el) => $(el).attr('src'))
    .toArray()
    .map((imgSrc) => toResource(url, imgSrc))
    .filter((resource) => resourceIsLocal(url, resource));

  const loadedImgResources = await Promise.all(imgResources.map(
    async (imgResource) => loadResource(url, imgResource, path),
  ));
  loadedImgResources.forEach((imgResource) => {
    $(`img[src="${imgResource.originUrl}"]`).attr('src', imgResource.filePath.replace(path, ''));
  });

  return $.html();
};

export default async (url, path) => {
  let { data: content } = await axios.get(url);
  content = await loadImg(url, path, content);
  const filePath = `${path}/${toFileName(url)}.html`;
  await saveToFile(filePath, content);
  return filePath;
};
