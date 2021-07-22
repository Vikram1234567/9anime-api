const axios = require("axios");
axios.default.defaults.headers = {
  referer: `https://9anime.to/`,
  "user-agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36`,
};
const cheerio = require("cheerio");

function packed(p, a, c, k, e, d) {
  while (c--)
    if (k[c])
      p = p.replace(new RegExp("\\b" + c.toString(a) + "\\b", "g"), k[c]);
  return p;
}

async function Vidstream(url) {
  const { data: embed } = await axios.get(url);
  const id = url.split("/").pop();
  const skey = embed.split("window.skey = '")[1].split("'")[0];

  const { data } = await axios.get(
    `https://vidstream.pro/info/${id}?skey=${skey}`
  );
  return data;
}
async function MyCloud(url) {
  const { data: embed } = await axios.get(url);
  const id = url.split("/").pop();
  const skey = embed.split("window.skey = '")[1].split("'")[0];

  const { data } = await axios.get(`https://mcloud.to/info/${id}?skey=${skey}`);
  return data;
}
/*
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
*/

module.exports = async (url) => {
  switch (true) {
    case url.includes("vidstream"):
      return await Vidstream(url);

    case url.includes("mcloud"):
      return await MyCloud(url);

    case url.includes("mp4upload"):
    case url.includes("streamtape"):
      return {
        success: true,
        url,
      };

    default:
      throw new Error("Video host is not supported");
  }
};
