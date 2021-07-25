const cheerio = require("cheerio");
const CryptoJS = require("crypto-js");
const getVideo = require("../client/getVideo");
const domain = process.env.DOMAIN ?? "http://localhost:5000/";

const parseCard = (e) => {
  const elem = cheerio.default(e);
  const splitUrl = elem.find("a").first().attr("href").split("/");
  const img = elem.find("img");
  const t = elem.find(".name");

  return {
    id: (splitUrl[4] ?? splitUrl[2]).split("?")[0],
    title: {
      en: t.text(),
      jp: t.data("jtitle"),
    },
    cover: img.attr("src"),
    type: elem.find(".taglist span:not(.dub)").first().text(),
    episode: elem.find(".ep").text(),
    dub: !!elem.find(".dub").length,
  };
};
const decryptURL = (url) => {
  const key = CryptoJS.enc.Utf8.parse(url.slice(0, 9));
  const encrypted = CryptoJS.enc.Base64.parse(url.slice(9));
  return CryptoJS.RC4.decrypt({ ciphertext: encrypted }, key).toString(
    CryptoJS.enc.Utf8
  );
};

class BaseController {
  constructor(agent, reqbin) {
    this.Agent = agent;
    this.Reqbin = reqbin;
  }

  ajaxRequest = async (path, query) => {
    const { data } = await this.Agent.get(
      `ajax/${path}?${new URLSearchParams(query).toString()}`
    );
    return data;
  };
  filter = async (filters) => {
    const { data } = await this.Agent.get(
      `filter?${new URLSearchParams(filters).toString()}`
    );
    const $ = cheerio.load(data);
    return {
      next: !$(".next.disabled").length,
      results: $(".anime-list > li").toArray().map(parseCard),
    };
  };

  async home(req, res) {
    try {
      const { data } = await this.Agent.get("home");
      const $ = cheerio.load(data);

      const parseCarouselItem = (el) => {
        const elem = $(el);
        const t = elem.find("h2 > a");
        const backdropSty = elem.find(".backdrop").attr("style");
        return {
          id: t.attr("href").split("/")[2],
          backdrop: backdropSty.slice(22, -2),
          title: {
            en: t.text(),
            jp: t.data("jtitle"),
          },
          synopsis: elem.find("p").text(),
        };
      };
      const highlight = $(".swiper-slide").toArray().map(parseCarouselItem);
      const latest = $(".anime-list")
        .last()
        .find("li")
        .toArray()
        .map(parseCard);

      res.json({
        success: true,
        highlight,
        latest,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
  async browse(req, res) {
    try {
      const { name } = req.params;
      const page = req.query.page ?? 1;
      const { html } = await this.ajaxRequest("home/widget", { name, page });
      const $ = cheerio.load(html);

      const results = $(".anime-list").find("li").toArray().map(parseCard);
      res.json({
        success: true,
        next:
          results.length < 15
            ? null
            : `${domain + req.path.substr(1)}?page=${+page + 1}`,
        results,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
  async search(req, res) {
    try {
      const { query } = req.params;
      const page = req.query.page ?? 1;
      const { next, results } = await this.filter({
        keyword: query,
        page,
      });

      res.json({
        success: true,
        next: next ? `${domain + req.path.substr(1)}?page=${+page + 1}` : null,
        results,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
  async anime(req, res) {
    try {
      const { id } = req.params;
      const [{ data }, { html }] = await Promise.all([
        this.Agent.get(`watch/${id}`),
        this.ajaxRequest(`anime/servers`, {
          id: id.split(".").pop(),
        }),
      ]);
      const $ = cheerio.load(data);
      const $ep = cheerio.load(html);

      const title = $(".title").first();
      const meta = $(".meta span:not(.quality)")
        .toArray()
        .map((e, i) => {
          if (i === 4)
            return $(e)
              .find("a")
              .toArray()
              .map((el) => ({
                id: $(el).attr("href").split("/")[4],
                title: $(el).attr("title"),
              }));
          else return $(e).text().trim();
        });

      res.json({
        success: true,
        details: {
          id,
          thumb: $(".backdrop").attr("style").slice(23, -2),
          cover: $(".thumb img").first().attr("src"),
          title: {
            en: title.text(),
            jp: title.data("jtitle"),
          },
          alias: $(".alias").text(),
          desc: $(".shorting").text(),
          type: meta[0],
          studios: meta[1],
          date_aired: meta[2],
          status: meta[3],
          genre: meta[4],
          country: meta[5],
          score: meta[6],
          premiered: meta[7],
          duration: meta[8],
          quality: meta[9],
          views: meta[10],
        },
        servers: $ep("span")
          .toArray()
          .map((e) => {
            const server = $(e);
            return {
              id: server.data("id"),
              name: server.text(),
            };
          }),
        episode_list: $ep("li > a")
          .toArray()
          .map((e) => {
            const episode = $(e);
            return {
              base: episode.data("base"),
              normalized: episode.data("name-normalized"),
              title: episode.text(),
              sources: episode.data("sources"),
            };
          }),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
  async episode(req, res) {
    let rawUrl, raw;
    try {
      const { id } = req.params;
      const response = await this.ajaxRequest("anime/episode", { id });
      const { url } = response;
      console.log(response);
      if (!url) throw new Error("Data not found");
      const decrypted = decryptURL(url);
      raw = url;
      rawUrl = decrypted;
      let vidData = {};
      try {
        vidData = await getVideo(decrypted);
      } catch (error) {
        const reqb = await this.Reqbin.fetchEpisode(id);
        const decr = decryptURL(reqb.url);
        vidData = await getVideo(decr);
      }
      res.json({ ...vidData, debug: { raw, url: rawUrl } });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
        debug: { raw, url: rawUrl },
      });
    }
  }
}

module.exports = BaseController;
