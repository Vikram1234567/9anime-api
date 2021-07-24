const axios = require("axios");
const domains = ["to", "ru", "pw", "at", "cz"];
async function requestAgent(options, index = 0) {
  const { url = "", headers, ...otherOptions } = options;
  const domain = domains[index];
  if (!domain) throw new Error("Invalid Domain Index");
  return await axios({
    url: `https://9anime.${domain}/${url}`,
    headers: {
      ...headers,
      origin: `https://9anime.${domain}/`,
      referer: `https://9anime.${domain}/`,
    },
    ...otherOptions,
  });
}

const getWaf = async (domain) => {
  try {
    await requestAgent(
      {
        url: "",
        method: "GET",
      },
      domain
    );
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
    .map((key) => `${key}=${encodeURIComponent(obj[key])}`)
    .join("; ");
};

class Agent {
  async init() {
    this.domain = process.env.DOMAIN ? 0 : 2;
    this.waf_cv = await getWaf(this.domain);
  }
  cycleDomain() {
    this.domain += 1;
    if (!domains[this.domain]) {
      this.domain = 0;
      throw new Error("Domain full cycle");
    }
  }
  async get(path, cookie = {}) {
    return await requestAgent(
      {
        url: path,
        headers: {
          Cookie: ObjectToCookie({
            ...cookie,
            waf_cv: this.waf_cv,
          }),
        },
        method: "GET",
      },
      this.domain
    );
  }
  async request(options, cookie = {}) {
    const { url, headers, ...other } = options ?? {};
    return await requestAgent(
      {
        url,
        ...other,
        headers: {
          ...headers,
          Cookie: ObjectToCookie({
            ...cookie,
            waf_cv: this.waf_cv,
          }),
        },
      },
      this.domain
    );
  }
}

module.exports = new Agent();
