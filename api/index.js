const Agent = require("./client/Agent");
const Controller = require("./client/controller");

const app = require("express")();
const port = process.env.PORT || 5000;

Agent.init().then(() => {
  Controller.init(Agent);

  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "9Anime API",
    });
  });

  app.get("/home", Controller.home);
  app.get("/browse/:name", Controller.browse);
  app.get("/search/:query", Controller.search);
  app.get("/anime/:id", Controller.anime);
  app.get("/episode/:id", Controller.episode);

  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Path not found",
    });
  });

  app.listen(port, () => console.log("Listening to port", port));

  module.exports = app;
});
