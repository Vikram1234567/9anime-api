const axios = require("axios");
const cheerio = require("cheerio");
const base = `https://gomunime.online/`;
const domain = process.env.DOMAIN ?? "http://localhost:5000/";

const parseCard = (e) => {
  const elem = cheerio.default(e);
  const link = elem.find(".name");

  return {
    id: link.attr("href").split("/")[4],
    title: link.text(),
    cover: elem.find("img").attr("src"),
    status: elem.find(".status").text(),
    type: elem.find(".taglist").text().trim(),
    episode: elem.find(".ep").text(),
  };
};

class Gomunime {
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
