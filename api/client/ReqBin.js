const axios = require("axios");

async function ReqbinRequest(path, waf) {
  const { data } = await axios({
    url: "https://apide.reqbin.com/api/v1/requests",
    headers: {
      "content-type": "application/json",
    },
    data: {
      id: "0",
      name: "",
      errors: "",
      json: JSON.stringify({
        method: "GET",
        url: `https://9anime.to/${path}`,
        apiNode: "DE",
        contentType: "",
        content: "",
        headers: waf ? `cookie: waf_cv=${waf}` : "",
        errors: "",
        curlCmd: "",
        auth: {
          auth: "noAuth",
          bearerToken: "",
          basicUsername: "",
          basicPassword: "",
          customHeader: "",
          encrypted: "",
        },
        compare: false,
        idnUrl: `https://9anime.to/${path}`,
      }),
      deviceId: "e6cca1fb-31b1-4df9-b436-982f977266c1R",
      sessionId: 1627205940776,
    },
    method: "POST",
  });
  return data.Content;
}
const getWaf = (data) => {
  let a = data
    .slice(data.indexOf(",'"), data.indexOf("');</script>"))
    .match(/[\w]{2}/g);
  if (!a.length) throw new Error("invalid data");
  for (let i = 0; i < a.length; i++)
    a[i] = String.fromCharCode(parseInt(a[i], 16));
  return a.join("");
};
class ReqBin {
  async init() {
    const data = await ReqbinRequest("");
    this.waf_cv = getWaf(data);
  }
  async fetchEpisode(id) {
    const data = await ReqbinRequest(
      `ajax/anime/episode?id=${id}`,
      this.waf_cv
    );
    return JSON.parse(data);
  }
}

module.exports = new ReqBin();
