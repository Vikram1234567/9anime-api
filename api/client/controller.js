const Agent = require("./Agent");
const cheerio = require("cheerio");
const domain = process.env.DOMAIN ?? "http://localhost:5000/";

const ajaxRequest = async (path, query) => {
  const { data } = await Agent.get(
    `ajax/${path}?${new URLSearchParams(query).toString()}`
  );
  return data;
};

const parseCard = (e) => {
  const elem = cheerio.default(e);
  const splitUrl = elem.find("a").first().attr("href").split("/");
  const img = elem.find("img");
  const t = elem.find(".name");

  return {
    id: splitUrl[4] ?? splitUrl[2],
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
async function filter(filters) {
  const { data } = await Agent.get(
    `filter?${new URLSearchParams(filters).toString()}`
  );
  const $ = cheerio.load(data);
  return {
    next: !$(".next.disabled").length,
    results: $(".anime-list > li").toArray().map(parseCard),
  };
}

class Controller {
  async home(req, res) {
    try {
      const { data } = await Agent.get("home");
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
      const { html } = await ajaxRequest("home/widget", { name, page });
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
      const { next, results } = await filter({
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
}

module.exports = new Controller();
