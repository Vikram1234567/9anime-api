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
  async anime(req, res) {
    try {
      const id = req.params.id;
      const [{ data }, { html }] = await Promise.all([
        Agent.get(`watch/${id}`),
        ajaxRequest(`anime/servers`, {
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
                title: $(el).data("title"),
              }));
          else return $(e).text();
        });

      res.json({
        success: true,
        details: {
          id,
          thumb: $(".backdrop").attr("style").slice(22, -2),
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
            console.log(episode.data("sources"));
            return {
              base: episode.data("base"),
              normalized: episode.data("normalized"),
              title: episode.text(),
              sources: JSON.parse(episode.data("sources")),
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
}

module.exports = new Controller();
