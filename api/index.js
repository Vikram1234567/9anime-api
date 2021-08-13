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
  authRoutes.post("/login", Auth.login);
  authRoutes.post("/register", Auth.register);
  authRoutes.post("/forgot-password", Auth.forgot_password);
  authRoutes.use("/delete", Auth.delete);
  authRoutes.get("/panel", Auth.panel);
  authRoutes.get("/watchlist", Auth.watchlist);
  authRoutes.post("/watchlist-edit", Auth.watchlist_edit);
  authRoutes.post("/update", Auth.update);

  // Base
  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "9Anime API",
    });
  });

  app.get("/home", Base.home);
  app.get("/browse/:name", Base.browse);
  app.get("/search/:query", Base.search);
  app.get("/genre/:id", Base.genre);
  app.get("/watch/:id", Base.watch);
  app.get("/episode/:id", Base.episode);
  app.get("/filter", Base.filter);
  app.get("/schedule", Base.schedule);
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
