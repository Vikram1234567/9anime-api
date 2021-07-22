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

  app.get("/home", Base.home.bind(Base));
  app.get("/browse/:name", Base.browse.bind(Base));
  app.get("/search/:query", Base.search.bind(Base));
  app.get("/anime/:id", Base.anime.bind(Base));
  app.get("/episode/:id", Base.episode.bind(Base));

  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Path not found",
    });
  });

  app.listen(port, () => console.log("Listening to port", port));

  module.exports = app;
});
