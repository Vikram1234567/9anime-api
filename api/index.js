const Agent = require("./client/Agent");
const Controller = require("./client/controller");

const app = require("express")();
const port = process.env.PORT || 5000;

Agent.init().then(() => {
  const Base = new Controller(Agent);

  const { home, browse, search, anime, episode } = Base;
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "9Anime API",
    });
  });

  app.get("/home", home);
  app.get("/browse/:name", browse);
  app.get("/search/:query", search);
  app.get("/anime/:id", anime);
  app.get("/episode/:id", episode);

  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Path not found",
    });
  });

  app.listen(port, () => console.log("Listening to port", port));

  module.exports = app;
});
