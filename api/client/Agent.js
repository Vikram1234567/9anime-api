const axios = require("axios").create({
  baseURL: `https://9anime.to/`,
});
const getWaf = async () => {
  try {
    await axios.get("");
  } catch (error) {
    const { data } = error.response;
    let a = data
      .slice(data.indexOf(",'"), data.indexOf("');</script>"))
      .match(/[\w]{2}/g);
    if (!a.length) return await getWaf();
    for (let i = 0; i < a.length; i++)
      a[i] = String.fromCharCode(parseInt(a[i], 16));
    return a.join("");
  }
};
const ObjectToCookie = (obj) => {
  return Object.keys(obj)
    .map((key) => `${key}=${obj[key]}`)
    .join("; ");
};

class Agent {
  async init() {
    this.waf_cv = await getWaf();
  }
  async get(path, cookie = {}) {
    return await axios.get(path, {
      headers: {
        Cookie: ObjectToCookie({
          ...cookie,
          waf_cv: this.waf_cv,
        }),
      },
    });
  }
  async request(options, cookie = {}) {
    const { headers, ...other } = options ?? {};
    return await axios.get(path, {
      ...other,
      headers: {
        ...headers,
        Cookie: ObjectToCookie({
          ...cookie,
          waf_cv: this.waf_cv,
        }),
      },
    });
  }
}

module.exports = new Agent();
