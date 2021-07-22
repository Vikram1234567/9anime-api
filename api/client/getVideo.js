const axios = require("axios");
const cheerio = require("cheerio");

function packed(p, a, c, k, e, d) {
  while (c--)
    if (k[c])
      p = p.replace(new RegExp("\\b" + c.toString(a) + "\\b", "g"), k[c]);
  return p;
}

const fetchEmbed = async (url) => {
  const { data } = await axios({
    url,
    headers: {
      referer: "https://9anime.to/",
    },
  });
  return data;
};

async function Vidstream(url) {
  const embed = await fetchEmbed(url);
  const id = url.split("/").pop();
  const skey = embed.split("window.skey = '")[1].split("'")[0];

  const data = await fetchEmbed(
    `https://vidstream.pro/info/${id}?skey=${skey}`
  );
  return data;
}
async function MyCloud(url) {
  const embed = await fetchEmbed(url);
  const id = url.split("/").pop();
  const skey = embed.split("window.skey = '")[1].split("'")[0];

  const data = await fetchEmbed(`https://mcloud.to/info/${id}?skey=${skey}`);
  return data;
}
async function Streamtape(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  return {
    success: true,
    media: {
      thumb: $('meta[name="og:image"]').attr("content"),
      sources: [{ file: `https:${$("#videolink").text()}` }],
    },
  };
}
async function Mp4upload(url) {
  const data = await fetchEmbed(url);
  const temp = eval(
    `packed${data.split("return p}")[1].split(")))")[0]}))`
  ).split('"');
  return {
    success: true,
    media: {
      thumb: temp[5],
      sources: [{ file: temp[3] }],
    },
  };
}

module.exports = async (url) => {
  switch (true) {
    case url.includes("vidstream"):
      return await Vidstream(url);

    case url.includes("mcloud"):
      return await MyCloud(url);

    case url.includes("streamtape"):
      return await Streamtape(url);

    case url.includes("mp4upload"):
      return await Mp4upload(url);

    default:
      throw new Error(`${url} is not supported`);
  }
};
