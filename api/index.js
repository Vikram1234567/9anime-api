const Gomunime = require("./client/Gomunime");

const app = require("express")();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Gomunime API",
  });
});
app.get("/home", Gomunime.home);
app.get("/search/:query", Gomunime.search);
app.get("/details/:id", Gomunime.details);
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Path not found",
  });
});

app.listen(port, () => console.log("Listening to port", port));

module.exports = app;
