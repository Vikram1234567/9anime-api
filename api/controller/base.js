const axios = require("axios");
const cheerio = require("cheerio");
const domain = process.env.DOMAIN ?? "http://localhost:5000/";
const DisqusKey =
  "E8Uh5l5fHZ6gD8U3KycjAIAk46f68Zw7C6eW8WSjZvCLXebZ7p0r1yrYDrLilk2F";
const btoa = (data) => Buffer.from(data, "binary").toString("base64");
const atob = (data) => Buffer.from(data, "base64").toString("binary");

function randomString(length) {
  var mask = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var result = "";
  for (var i = length; i > 0; --i)
    result += mask[Math.floor(Math.random() * mask.length)];
  return result;
}
const decrypt = (data) => {
  const t = data.slice(0, 16),
    n = atob(data.slice(16));

  for (var i, r = [], u = 0, x = "", e = 256, o = 0; o < e; o += 1) r[o] = o; /// make array of 256 number
  for (o = 0; o < e; o += 1) {
    u = (u + r[o] + t.charCodeAt(o % t.length)) % e;
    i = r[o];
    r[o] = r[u];
    r[u] = i;
  }
  for (var c = (u = o = 0); c < n.length; c += 1) {
    u = (u + r[(o = (o + c) % e)]) % e;
    i = r[o];
    r[o] = r[u];
    r[u] = i;
    x += String.fromCharCode(n.charCodeAt(c) ^ r[(r[o] + r[u]) % e]);
  }
  return x;
};
const encrypt = (data) => {
  const t = randomString(16),
    n = data;

  for (var i, r = [], u = 0, x = "", e = 256, o = 0; o < e; o += 1) r[o] = o; /// make array of 256 number
  for (o = 0; o < e; o += 1) {
    u = (u + r[o] + t.charCodeAt(o % t.length)) % e;
    i = r[o];
    r[o] = r[u];
    r[u] = i;
  }
  for (var c = (u = o = 0); c < n.length; c += 1) {
    u = (u + r[(o = (o + c) % e)]) % e;
    i = r[o];
    r[o] = r[u];
    r[u] = i;
    x += String.fromCharCode(n.charCodeAt(c) ^ r[(r[o] + r[u]) % e]);
  }
  return t + btoa(x);
};
async function getThread(ident) {
  const {
    data: {
      response: { id, posts },
    },
  } = await axios.get(
    `https://disqus.com/api/3.0/threads/details.json?${new URLSearchParams({
      "thread:ident": ident,
      forum: "9anime-to",
      api_key: DisqusKey,
    })}`
  );
  return {
    id: id,
    total: posts,
  };
}

const parseCard = (e) => {
  const elem = cheerio.default(e);
  const splitUrl = elem.find("a").first().attr("href").split("/");
  const img = elem.find("img");
  const t = elem.find(".name");

  return {
    id: (splitUrl[4] ?? splitUrl[2]).split("?")[0],
    title: {
      en: t.text(),
      jp: t.data("jtitle") || null,
    },
    cover: img.attr("src"),
    type: elem.find(".taglist span:not(.dub)").first().text() || null,
    episode: elem.find(".ep").text(),
    dub: !!elem.find(".dub").length,
  };
};
const parseComment = ({
  raw_message,
  likes,
  dislikes,
  createdAt,
  media,
  author: {
    name,
    avatar: { cache },
  },
  depth,
}) => {
  const member_img = (cache.startsWith("//") ? "https:" : "") + cache;
  return {
    text: raw_message,
    media,
    likes,
    dislikes,
    member_name: name,
    member_img,
    createdAt,
    depth,
  };
};

class BaseController {
  constructor(agent, reqbin) {
    this.Agent = agent;
    this.Reqbin = reqbin;
    this.cache = new Map();
  }

  ajaxRequest = async (path, query) => {
    const { data } = await this.Agent.get(
      `ajax/${path}?${new URLSearchParams(query)}`
    );
    return data;
  };
  filterRequest = async (filters, page) => {
    const useToken = filters.length === 1 && filters[0][0] === "keyword";
    if (useToken) filters.push(["verified", encrypt(filters[0][1])]);
    const { data } = await this.Agent.get(
      `${useToken ? "search" : "filter"}?${new URLSearchParams([
        ...filters,
        ["page", page],
      ])}`
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
            jp: t.data("jtitle") || null,
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
      const { next, results } = await this.filterRequest(
        [["keyword", query]],
        page
      );

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
          verified: encrypt(id.split(".").pop()),
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
              jp: a.data("jtitle") || null,
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
          thumb: $(".backdrop").attr("style").slice(23, -2) || null,
          cover: $(".thumb img").first().attr("src"),
          title: {
            en: title.text(),
            jp: title.data("jtitle") || null,
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

      raw = url;
      const decrypted = decrypt(url);
      rawUrl = decrypted;

      res.json({ success: true, url: decrypted });
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

      const { next, results } = await this.filterRequest(query, page);

      res.json({
        success: true,
        next: next
          ? `${domain + req.path.substr(1)}?${new URLSearchParams([
              ...query,
              ["page", page],
            ])}`
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
            jp: t.data("jtitle") || null,
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
  async comments(req, res) {
    let { id, thread, ep, ...query } = req.query;
    if (!id && !thread)
      return res.status(400).json({
        success: false,
        message: "Missing required argument",
      });
    let total = null;
    try {
      if (!thread) {
        const ident = id + (ep ? `_${ep}` : "");
        const threadData = this.cache.get(ident) || (await getThread(ident));
        if (!threadData)
          return res.status(404).json({
            success: false,
            message: "Data not found",
          });
        thread = threadData.id;
        total = threadData.total;
      }

      const { data } = await axios.get(
        `https://disqus.com/api/3.0/threads/listPostsThreaded?${new URLSearchParams(
          {
            thread,
            forum: "9anime-to",
            api_key: DisqusKey,
            ...query,
          }
        )}`
      );

      const comments = data.response.map(parseComment);
      const { hasNext, next } = data.cursor;
      query.cursor = next;
      res.json({
        success: true,
        thread,
        total,
        next: hasNext
          ? `${domain + req.path.substr(1)}?${new URLSearchParams({
              thread,
              ...query,
            })}`
          : null,
        comments,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
  async reactions(req, res) {
    try {
      const {
        data: {
          response: { reactions },
        },
      } = await axios.get(
        `https://disqus.com/api/3.0/threadReactions/loadReactions?${new URLSearchParams(
          {
            thread: req.params.thread,
            api_key: DisqusKey,
          }
        )}`
      );

      const action_average = reactions[0].votes;
      const action_funny = reactions[1].votes;
      const action_amazing = reactions[2].votes;
      const action_surprised = reactions[3].votes;
      const action_sad = reactions[4].votes;
      const action_angry = reactions[5].votes;

      res.json({
        success: true,
        total_response:
          action_average +
          action_funny +
          action_amazing +
          action_surprised +
          action_sad +
          action_angry,
        action_average,
        action_funny,
        action_amazing,
        action_surprised,
        action_sad,
        action_angry,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
}

module.exports = BaseController;
