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

const loadImg = async (url, path, content) => {
  const $ = cheerio.load(content);
  let imgs = $('img')
    .map((i, el) => $(el).attr('src'))
    .toArray()
    .map((imgSrc) => ({
      originUrl: imgSrc,
      url: new URL(imgSrc, new URL(url).origin),
      filePath: undefined
    }))
    .filter((img) => img.url.host.endsWith(new URL(url).host));

  imgs = await Promise.all(imgs.map(async (img) => {
    const { data: imgContent } = (await axios.get(img.url.href, { responseType: 'arraybuffer' }));
    const filePath = join(path, `${toFileName(url)}_files`, toFileName(img.url.href));
    await saveToFile(filePath, imgContent);
    img.filePath = filePath;
    return img;
  }));

  imgs.forEach((img) => {
    $(`img[src="${img.originUrl}"]`).attr('src', img.filePath.replace(path, ''));
  });

  return $.html();
};

export default async (url, path) => {
  let { data: content } = await axios.get(url);
  content = await loadImg(url, path, content);
  const filePath = `${path}/${toFileName(url)}.html`;
  await writeFile(filePath, content);
  return filePath;
};
