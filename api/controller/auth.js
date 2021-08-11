const cheerio = require("cheerio");

class AuthController {
  constructor(agent) {
    this.Agent = agent;
  }

  ajaxRequest = async (path, cookies) => {
    const { data } = await this.Agent.get(`ajax/user/${path}`, cookies);
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
  async register(req, res) {
    try {
      const { username, email, password, password_confirmation, captcha } =
        req.body;

      const {
        data: {
          error,
          messages: [message],
        },
      } = await this.Agent.request({
        url: "ajax/user/register",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        data: new URLSearchParams({
          username,
          email,
          password,
          password_confirmation,
          "g-recaptcha-response": captcha,
        }).toString(),
        method: "POST",
      });

      if (error)
        return res.status(403).json({
          success: false,
          message,
        });

      res.json({
        success: true,
        message,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
  async forgot_password(req, res) {
    try {
      const { identifier, captcha } = req.body;

      const {
        data: {
          error,
          messages: [message],
        },
      } = await this.Agent.request({
        url: "ajax/user/forgot-password",
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        data: new URLSearchParams({
          identifier,
          "g-recaptcha-response": captcha,
        }).toString(),
        method: "POST",
      });

      if (error)
        return res.status(403).json({
          success: false,
          message,
        });

      res.json({
        success: true,
        message,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.toString(),
      });
    }
  }
  async delete(req, res) {
    try {
      const {
        cookies,
        body: { _token, confirm },
      } = req;

      if (!cookies) throw new Error("Forbidden");

      if (!token) {
        const { data } = await this.Agent.get("user/delete", cookies);
        const $ = cheerio.load(data);
        const token = $(`input[name="_token"]`).attr("value");

        res.json({ success: true, token });
      } else {
        const { data, status } = await this.Agent.request({
          url: "user/delete",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
          },
          method: "POST",
          data: new URLSearchParams({ _token, confirm }).toString(),
        });

        if (status === 200) {
          const $ = cheerio.load(data);
          return res.status(403).json({
            success: false,
            message: $(".alert").text().trim(),
          });
        }

        res.json({
          success: true,
          message: "Account deleted",
        });
      }
    } catch (error) {
      console.error(error);
      res.status(403).json({
        success: false,
        message: "Forbidden",
      });
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
