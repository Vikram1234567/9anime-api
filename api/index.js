const Agent = require("./client/Agent");
const Controller = require("./client/controller");

const app = require("express")();
const port = process.env.PORT || 5000;

Agent.init().then(() => {
  const Base = new Controller(Agent);

  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "9Anime API",
    });
  });

  app.get("/home", Base.home);
  app.get("/browse/:name", Base.browse);
  app.get("/search/:query", Base.search);
  app.get("/anime/:id", Base.anime);
  app.get("/episode/:id", Base.episode);

  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Path not found",
    });
  });

  app.listen(port, () => console.log("Listening to port", port));

  module.exports = app;
});
