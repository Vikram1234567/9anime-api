const cheerio = require("cheerio");

class AuthController {
  constructor(agent) {
    this.Agent = agent;
  }

  ajaxRequest = async (path, cookies) => {
    const { data } = await this.Agent.get(`ajax/user/${path}`, { ...cookies });
    return data;
  };

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const {
        data: {
          error,
          messages: [message],
        },
        headers,
      } = await this.Agent.request({
        url: `ajax/user/login`,
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        data: `username=${username}&password=${password}&remember=on`,
      });

      if (error)
        return res.status(403).json({
          success: false,
          message,
        });

      const token = headers["set-cookie"][1].split(";")[0].split("=");

      res.json({
        success: true,
        token: {
          key: token[0],
          value: token[1],
        },
        message,
      });
    } catch (er) {
      console.error(er);
      const { data } = er.response;
      res.status(500).json(data);
    }
  }
  async panel(req, res) {
    try {
      const cookies = req.cookies;
      if (!cookies) throw new Error("Forbidden");

      const { user } = await this.ajaxRequest("panel", cookies);
      if (!user) throw new Error("Forbidden");
      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error(error);
      res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }
  }
  async watchlist(req, res) {
    try {
      const cookies = req.cookies;
      if (!cookies) throw new Error("Forbidden");

      const { data } = await this.Agent.get("user/watchlist", cookies);
      const $ = cheerio.load(data);

      const list = $(".anime-list-v li")
        .toArray()
        .map((e) => {
          const elem = $(e);
          const t = elem.find("a");
          return {
            id: t.attr("href").split("/")[2].split("?")[0],
            title: {
              en: t.text(),
              jp: t.data("jtitle"),
            },
            cover: elem.find("img").attr("src"),
            episode: elem.find(".ep").text(),
            folder: elem.find(".folder span").text(),
            bookmarked: elem.find(".bookmarked").text().trim(),
            watchstatus: elem.find(".watchstatus").data("value"),
          };
        });
      res.json({
        success: true,
        list,
      });
    } catch (error) {
      console.error(error);
      res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }
  }
  async watchlist_edit(req, res) {
    try {
      const {
        cookies,
        body: { id, folder },
      } = req;
      if (!cookies) throw new Error("Forbidden");

      const {
        data: {
          error,
          messages: [message],
        },
      } = await this.Agent.request(
        {
          url: `ajax/user/watchlist-edit`,
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          data: `id=${id}&folder=${folder}`,
        },
        cookies
      );

      if (error)
        return res.status(403).json({
          success: false,
          message,
        });

      res.json({
        success: true,
        message,
      });
    } catch (er) {
      console.error(er);
      const { data } = er.response;
      res.status(500).json(data);
    }
  }
  async update(req, res) {
    try {
      const { cookies, body } = req;
      if (!cookies) throw new Error("Forbidden");

      const {
        data: {
          error,
          messages: [message],
        },
      } = await this.Agent.request(
        {
          url: `ajax/user/update`,
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          data: new URLSearchParams(body).toString(),
        },
        cookies
      );

      if (error)
        return res.status(403).json({
          success: false,
          message,
        });

      res.json({
        success: true,
        message,
      });
    } catch (error) {}
  }
}

module.exports = AuthController;
