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
    this.session = null;
    this.domain = process.env.DOMAIN ? 0 : 2;
    this.waf_cv = await getWaf(this.domain);
  }
  async get(path, cookie = {}) {
    const { session: s, otherCookie } = cookie;
    const session = s ?? this.session;
    return await requestAgent(
      {
        url: path,
        headers: {
          Cookie: ObjectToCookie({
            ...otherCookie,
            session,
            waf_cv: this.waf_cv,
          }),
        },
        method: "GET",
      },
      this.domain
    );
  }
  async request(options, cookie = {}) {
    const { session: s, otherCookie } = cookie;
    const session = s ?? this.session;
    const { url, headers, ...other } = options ?? {};
    return await requestAgent(
      {
        url,
        ...other,
        headers: {
          ...headers,
          Cookie: ObjectToCookie({
            ...otherCookie,
            session,
            waf_cv: this.waf_cv,
          }),
        },
      },
      this.domain
    );
  }
}

module.exports = new Agent();
