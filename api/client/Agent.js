const axios = require("axios").create({
  baseURL: `https://9anime.to/`,
});
const getCookie = async () => {
  try {
    await axios.get("");
  } catch (error) {
    const { data } = error.response;
    let a = data
      .slice(data.indexOf(",'"), data.indexOf("');</script>"))
      .match(/[\w]{2}/g);
    if (!a.length) return await getCookie();
    for (let i = 0; i < a.length; i++)
      a[i] = String.fromCharCode(parseInt(a[i], 16));
    return "waf_cv=" + a.join("") + "; max-age=8640000; path=/;";
  }
};

const ObjectToCookie = (obj) => {
  return Object.keys(obj)
    .map((key) => `${key}=${encodeURIComponent(obj[key])}`)
    .join("; ");
};

class Agent {
  async init() {
    this.cookie = await getCookie();
  }
  async get(path, cookie = {}) {
    return await axios.get(path, {
      headers: {
        Cookie: this.cookie,
      },
    });
  }
  async request(options, cookie = {}) {
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
