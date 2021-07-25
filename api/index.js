const Agent = require("./client/Agent");
const Reqbin = require("./client/Reqbin");
const BaseController = require("./controller/base");
const AuthController = require("./controller/auth");

const express = require("express");
const app = express();
const authRoutes = express.Router();
const port = process.env.PORT || 5000;

app.use(express.json());

Promise.all([Agent.init(), Reqbin.init()]).then(() => {
  const Base = new BaseController(Agent, Reqbin);
  const Auth = new AuthController(Agent);

  // Auth Router

  authRoutes.post("/login", Auth.login.bind(Auth));
  authRoutes.post("/panel", Auth.panel.bind(Auth));

  // Base
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
  app.use("/user", authRoutes);
  app.use("*", (req, res) => {
    res.status(404).json({
      success: false,
      message: "Path not found",
    });
  });

  app.listen(port, () => console.log("Listening to port", port));

  module.exports = app;
});
