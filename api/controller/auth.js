const cheerio = require("cheerio");

class AuthController {
  constructor(agent) {
    this.Agent = agent;
    this.sessionCache = new Map();
  }

  ajaxRequest = async (path, token) => {
    const { data } = await this.Agent.get(`ajax/user/${path}`, {
      remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d: token,
    });
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

      const token = headers["set-cookie"][1].split(";")[0].split("=")[1];

      res.json({
        success: true,
        token,
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
        headers,
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

      const token = headers["set-cookie"][1].split(";")[0].split("=")[1];

      res.json({
        success: true,
        token,
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
        cookies: { token },
        body: { _token, confirm },
      } = req;

      if (!token) throw new Error("Forbidden");

      if (!_token) {
        const { data, headers } = await this.Agent.get("user/delete", {
          remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d: token,
        });

        this.sessionCache.set(
          token,
          headers["set-cookie"][0].split(";")[0].split("=")[1]
        );

        const $ = cheerio.load(data);
        const deleteToken = $(`input[name="_token"]`).val();

        res.json({ success: true, token: deleteToken });
      } else {
        const session = this.sessionCache.get(token);
        if (!session) throw new Error("Forbidden");

        const {
          data,
          request: {
            res: { responseUrl },
          },
        } = await this.Agent.request(
          {
            url: "user/delete",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
            },
            method: "POST",
            data: new URLSearchParams({ _token, confirm }).toString(),
          },
          {
            remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d: token,
            session,
          }
        );

        if (responseUrl.includes("user/delete")) {
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
  async profile(req, res) {
    try {
      const { token } = req.cookies;
      if (!token) throw new Error("Forbidden");

      const { data } = await this.Agent.get("user/profile", {
        remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d: token,
      });
      const $ = cheerio.load(data);

      res.json({
        success: true,
        user: {
          username: $('input[name="username"]').val(),
          email: $('input[placeholder="Email"]').val(),
        },
      });
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
      const { token } = req.cookies;
      if (!token) throw new Error("Forbidden");

      const { user } = await this.ajaxRequest("panel", token);
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
      const { token } = req.cookies;
      if (!token) throw new Error("Forbidden");

      const { data } = await this.Agent.get("user/watchlist", {
        remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d: token,
      });
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
            watchstatus: elem.find(".watchstatus").val(),
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
        cookies: { token },
        body: { id, folder },
      } = req;
      if (!token) throw new Error("Forbidden");

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
        { remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d: token }
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
      const {
        cookies: { token },
        body,
      } = req;
      if (!token) throw new Error("Forbidden");

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
        { remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d: token }
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
    } catch (error) {
      console.error(error);
      const { data } = error.response;
      res.status(500).json(data);
    }
  }
}

module.exports = AuthController;
