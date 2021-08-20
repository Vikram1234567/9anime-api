const Agent = require("./client/Agent");
const Reqbin = require("./client/ReqBin");
const BaseController = require("./controller/base");
const AuthController = require("./controller/auth");

const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();
const authRoutes = express.Router();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

Promise.all([Agent.init(), Reqbin.init()]).then(() => {
  const Base = new BaseController(Agent, Reqbin);
  const Auth = new AuthController(Agent);

  // Auth Router
  authRoutes.post("/login", Auth.login.bind(Auth));
  authRoutes.post("/register", Auth.register.bind(Auth));
  authRoutes.post("/forgot-password", Auth.forgot_password.bind(Auth));
  authRoutes.use("/delete", Auth.delete.bind(Auth));
  authRoutes.get("/panel", Auth.panel.bind(Auth));
  authRoutes.get("/profile", Auth.profile.bind(Auth));
  authRoutes.get("/watchlist", Auth.watchlist.bind(Auth));
  authRoutes.post("/watchlist-edit", Auth.watchlist_edit.bind(Auth));
  authRoutes.post("/update", Auth.update.bind(Auth));

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
  app.get("/genre/:id", Base.genre.bind(Base));
  app.get("/watch/:id", Base.watch.bind(Base));
  app.get("/episode/:id", Base.episode.bind(Base));
  app.get("/filter", Base.filter.bind(Base));
  app.get("/schedule", Base.schedule.bind(Base));
  app.get("/comments", Base.comments.bind(Base));
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
