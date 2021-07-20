const axios = require("axios").create({
  baseURL: `https://9anime.to/`,
});
const parseCookie = (ia) => {
  var i,
    a = ia;
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
  cookieGetter = async () => {
    const updateCookie = async () => {
      this.cookie = await getCookie();
    };
    await updateCookie();
    setInterval(updateCookie, 8640000);
  };

  async get(path) {
    if (!this.cookie) await this.cookieGetter();
    return await axios.get(path, {
      headers: {
        Cookie: this.cookie,
      },
    });
  }
  async request(options) {
    if (!this.cookie) await this.cookieGetter();
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
