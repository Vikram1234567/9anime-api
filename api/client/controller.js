const Agent = require("./Agent");

class Controller {
  async home(req, res) {
    try {
      const { data } = await Agent.get("");
      res.json({
        success: true,
        data,
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
