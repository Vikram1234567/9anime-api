const cheerio = require("cheerio");

class AuthController {
  constructor(agent) {
    this.Agent = agent;
  }

  ajaxRequest = async (path, session) => {
    const { data } = await this.Agent.get(`ajax/user/${path}`, { session });
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

      res.json({
        success: true,
        session: headers["set-cookie"][0].slice(8).split(";")[0],
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
      const { session } = req.body;
      if (!session) throw new Error("Forbidden");

      const { user } = await this.ajaxRequest("panel", session);
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
}

module.exports = AuthController;
