const app = require("express")();
const port = process.env.PORT || 5000;
const Controller = require("./client/controller");

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "9Anime API",
  });
});
app.get("/home", Controller.home);
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Path not found",
  });
});

app.listen(port, () => console.log("Listening to port", port));

module.exports = app;
