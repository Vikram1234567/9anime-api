const Gomunime = require("./client/Gomunime");

const app = require("express")();
const port = process.env.PORT || 5000;

app.get("/search/:query", Gomunime.search);

app.listen(port, () => console.log("Listening to port", port));

module.exports = app;
