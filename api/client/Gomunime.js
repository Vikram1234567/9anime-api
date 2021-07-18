const axios = require("axios").create({
  baseURL: `https://gomunime.online`,
});
const cheerio = require("cheerio");
const domain = process.env.DOMAIN ?? "http://localhost:5000/";

const toDate = (str) => {
  const month = {
    Januari: "January",
    Februari: "February",
    Maret: "March",
    April: "April",
    Mei: "May",
    Juni: "June",
    Juli: "July",
    Agustus: "August",
    September: "September",
    Oktober: "October",
    November: "November",
    Desember: "December",
  };
  return new Date(
    str.replace(
      /Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember/,
      (e) => month[e]
    )
  ).toLocaleDateString("id", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
const getTitle = (it) => {
  let te = it;
  const first = te.match(/OVA|BD|Episode/)?.index;
  if (!first) return "Movie";
  te = te.slice(first, te.indexOf("Sub Indo")).trim();
  return te.includes("OVA") ? te.replace("Episode ", "") : te;
};

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
    url: "/wp-admin/admin-ajax.php",
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
      const { data } = await axios.get("/");
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
        `/page/${page}/?s=${encodeURIComponent(req.params.query)}`
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
  async details(req, res) {
    try {
      const {
        data,
        request: {
          res: { responseUrl },
        },
      } = await axios.get(`/anime/${req.params.id}`);
      const $ = cheerio.load(data);

      let type, status, total_episode, duration, studio, release_date;

      $(".spe span").map((i, el) => {
        const text = $(el).text().split(": ");
        const value = text[1];
        switch (text[0]) {
          case "TYPE ":
            type = value;
            break;
          case "STATUS ":
            status = value;
            break;
          case "TOTAL EPISODE":
            total_episode = value;
            break;
          case "DURASI":
            duration = value;
            break;
          case "STUDIO":
            studio = value;
            break;
          case "RILIS":
            release_date = value;
            break;
          default:
            break;
        }
      });

      const details = {
        id: responseUrl.split("/")[4],
        cover: $(".thumbposter > img").data("lazy-src"),
        banner: $(".ime img").data("lazy-src").split("-300")[0] + ".jpg",
        title: $(".entry-title").text(),
        japanese: $(".alter").text(),
        score: $(`meta[itemprop="ratingValue"]`).attr("content"),
        type,
        status,
        total_episode,
        duration,
        studio,
        release_date,
        genre: $(".genxed a")
          .toArray()
          .map((a) => {
            const elem = $(a);
            return {
              id: elem.attr("href").split("/")[4],
              text: elem.text(),
            };
          }),
        synopsis: $(".entry-content").text(),
      };
      const parseEpisodeItem = (a) => {
        return {
          index: +a["ep-num"],
          id: a["ep-link"].split("/")[3],
          title: getTitle(a["ep-title"]),
          date: toDate(a["ep-date"]),
        };
      };
      const episode_list = JSON.parse(
        data.split("episodelist = ")[1].split(";")[0]
      ).map(parseEpisodeItem);

      res.json({
        success: true,
        details,
        episode_list,
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
