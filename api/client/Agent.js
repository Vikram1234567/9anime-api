const axios = require("axios").create({
  baseURL: `https://9anime.to/`,
});
const parseCookie = (str) => {
  var i,
    a = str;
  for (i = 0; i < a.length; i++) a[i] = String.fromCharCode(parseInt(a[i], 16));
  return "waf_cv=" + a.join("") + "; max-age=8640000; path=/;";
};
const getCookie = async () => {
  try {
    await axios.get("");
  } catch (error) {
    const { data } = error.response;
    return parseCookie(
      data
        .slice(data.indexOf(",'"), data.indexOf("');</script>"))
        .match(/[\w]{2}/g)
    );
  }
};
class Agent {
  async get(path) {
    if (!this.cookie) this.cookie = await getCookie();
    return await axios.get(path, {
      headers: {
        Cookie: this.cookie,
      },
    });
  }
  async request(options) {
    if (!this.cookie) this.cookie = await getCookie();
    const { headers, ...other } = options ?? {};
    return await axios.get(path, {
      ...other,
      headers: {
        ...headers,
        Cookie: this.cookie,
      },
    });
  }
}

module.exports = new Agent();
