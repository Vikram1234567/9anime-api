const Agent = require("./Agent");

const ajaxRequest = async (query) => {
  const { data } = await Agent.get(
    `ajax/home/widget?${new URLSearchParams(query).toString()}`
  );
  return data;
};

class Controller {
  async home(req, res) {
    try {
      const { data } = await Agent.get("home");
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
