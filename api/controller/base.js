const cheerio = require("cheerio");
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
const atob = (data) => Buffer.from(data, "base64").toString("binary");
const decryptURL = (url) => {
  const t = url.slice(0, 16),
    n = atob(url.slice(16));

  for (var i, r = [], u = 0, x = "", e = 256, o = 0; o < e; o += 1) r[o] = o;
  for (o = 0; o < e; o += 1)
    (u = (u + r[o] + t.charCodeAt(o % t.length)) % e),
      (i = r[o]),
      (r[o] = r[u]),
      (r[u] = i);
  for (var c = (u = o = 0); c < n.length; c += 1)
    (u = (u + r[(o = (o + c) % e)]) % e),
      (i = r[o]),
      (r[o] = r[u]),
      (r[u] = i),
      (x += String.fromCharCode(n.charCodeAt(c) ^ r[(r[o] + r[u]) % e]));
  return x;
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
  filterRequest = async (filters) => {
    const { data } = await this.Agent.get(
      `filter?${new URLSearchParams(filters).toString()}`
    );
    const $ = cheerio.load(data);
    return {
      next: $(".next").length && !$(".next.disabled").length,
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
      const { next, results } = await this.filterRequest({
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
  async watch(req, res) {
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

      const haveRelated = $(".sidebar section").length === 4;

      const parseRelated = (section) => {
        const parseMiniCard = (c) => {
          const elem = $(c);
          const a = elem.find("a");
          const m = elem.find(".meta").text().trim().split("  ");
          return {
            id: a.attr("href").split("/")[2],
            title: {
              en: a.text(),
              jp: a.data("jtitle"),
            },
            cover: elem.find("img").attr("src"),
            episode: m[0],
            duration: m[1],
          };
        };

        return {
          list: section.find("li").toArray().map(parseMiniCard),
          more: section.find(".more").attr("href")?.split("=")[1] ?? null,
        };
      };
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
          related: haveRelated
            ? parseRelated($(".sidebar section:nth-child(3)"))
            : null,
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
      const { url } = await this.Reqbin.fetchEpisode(id);
      if (!url) throw new Error("Data not found");

      const decrypted = decryptURL(url);
      raw = url;
      rawUrl = decrypted;

      res.json({ ...(await getVideo(decrypted)), debug: { raw, url: rawUrl } });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
        debug: { raw, url: rawUrl },
      });
    }
  }
  async genre(req, res) {
    try {
      const { id } = req.params;
      const page = req.query.page ?? 1;
      const { data } = await this.Agent.get(`genre/${id}?page=${page}`);
      const $ = cheerio.load(data);

      res.json({
        success: true,
        next: !$(".next.disabled").length
          ? `${domain + req.path.substr(1)}?page=${+page + 1}`
          : null,
        results: $(".anime-list > li").toArray().map(parseCard),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
  async filter(req, res) {
    try {
      let {
        genre,
        keyword,
        season,
        type,
        language,
        country,
        year,
        status,
        sort,
        page,
      } = req.query;
      if (!page) page = 1;
      let query = [];

      query.push((genre ?? []).map((a) => ["genre[]", a]));
      query.push((season ?? []).map((a) => ["season[]", a]));
      query.push((type ?? []).map((a) => ["type[]", a]));
      query.push((language ?? []).map((a) => ["language[]", a]));
      query.push((country ?? []).map((a) => ["country[]", a]));
      query.push((year ?? []).map((a) => ["year[]", a]));

      query = query.flat();

      if (keyword) query.push(["keyword", keyword]);
      if (status) query.push(["status[]", status]);
      if (sort) query.push(["sort", sort]);

      if (!query.length) {
        req.params = {
          name: "updated_all",
        };
        req.query = {
          page,
        };
        return this.browse(req, res);
      }
      query.push(["page", page]);

      const { next, results } = await this.filterRequest(query);
      query.pop();
      query.push(["page", +page + 1]);

      res.json({
        success: true,
        next: next
          ? `${domain + req.path.substr(1)}?${new URLSearchParams(
              query
            ).toString()}`
          : null,
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
  async schedule(req, res) {
    try {
      const { data } = await this.Agent.get(
        `schedule?${new URLSearchParams(req.query)}`
      );
      const $ = cheerio.load(data);

      let current;
      const month = $(".current").text().split(" ")[0];

      const parseScheduleItem = (e) => {
        const elem = $(e);
        const t = elem.find("div").first();
        return {
          id: elem.find("a").attr("href").split("/")[4],
          title: {
            en: t.text(),
            jp: t.data("jtitle"),
          },
          time: elem.find("time").text(),
          episode: elem.find(".ep").text(),
        };
      };
      const parseSchedule = (e) =>
        $(e).find(".item").toArray().map(parseScheduleItem);
      const parseDay = (e, i) => {
        const elem = $(e);

        if (elem.hasClass("active")) current = i;

        return {
          index: i,
          day: elem.find(".wday").text().substr(0, 3).toUpperCase(),
          date: `${month} ${elem.find(".nday").text()}`,
        };
      };

      const days = $(".heading").toArray().map(parseDay);

      res.json({
        success: true,
        current,
        days,
        schedules: $(".items").toArray().map(parseSchedule),
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

module.exports = BaseController;
