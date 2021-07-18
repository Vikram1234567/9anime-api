const axios = require("axios");
const cheerio = require("cheerio");
const base = `https://gomunime.online/`;
const domain = process.env.DOMAIN ?? "http://localhost:5000/";

// Element Digest
const parseCard = (e) => {
  const elem = cheerio.default(e);
  const splitUrl = elem.find("a").first().attr("href").split("/");
  const img = elem.find("img");
  return {
    id: splitUrl[4] ? splitUrl[4] : splitUrl[3],
    title: elem.find(".name").text(),
    cover: img.data("lazy-src") ?? img.attr("src"),
    status: elem.find(".status").text(),
    type: elem.find(".taglist span").first().text(),
    episode: elem.find(".ep").text(),
    hot: !!elem.find(".dub").length,
  };
};
const parseCarouselItem = (e) => {
  const elem = cheerio.default(e);

  return {
    id: elem.find("a").attr("href").split("/")[4],
    backdrop: elem.find(".backdrop").data("background"),
    title: elem.find("h2").text(),
    synopsis: elem.find("p").text(),
  };
};

const ajaxRequest = async (query) => {
  const { data } = await axios({
    url: base + "wp-admin/admin-ajax.php",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    },
    data: new URLSearchParams(query).toString(),
    method: "POST",
  });
  return data;
};
const homelist = async (list) => {
  const data = await ajaxRequest({
    action: "home_ajax",
    fungsi: list,
    pag: 1,
  });

  const $ = cheerio.load(data.html);
  const results = $("li").toArray().map(parseCard);
  return results;
};

class Gomunime {
  async home(req, res) {
    try {
      const { data } = await axios.get(base);
      const $ = cheerio.load(data);

      const hl = ["e", "c", "la", "t"];
      const highlight = $(".swiper-slide").toArray().map(parseCarouselItem);
      const [terbaru, completed, liveaction, trending] = await Promise.all(
        hl.map(homelist)
      );
      const baru = $(".anime-list").last().find("li").toArray().map(parseCard);

      res.json({
        success: true,
        highlight,
        terbaru,
        completed,
        baru,
        liveaction,
        trending,
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
      const page = req.query.page ?? 1;
      const { data } = await axios.get(
        `${base}page/${page}/?s=${encodeURIComponent(req.params.query)}`
      );
      const $ = cheerio.load(data);
      let next = $(".next");
      next = next.length
        ? next.hasClass("disabled")
          ? null
          : `${domain + req.path.substr(1)}?page=${+page + 1}`
        : null;
      res.json({
        success: true,
        next,
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
}

module.exports = new Gomunime();
