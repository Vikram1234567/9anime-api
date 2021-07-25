const axios = require("axios");
async function requestAgent(options, domain) {
  const { url = "", headers, ...otherOptions } = options;
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
    this.domain = process.env.DOMAIN ? "to" : "pw";
    this.waf_cv = await getWaf(this.domain);
  }
  async get(path, cookie = {}) {
    return await requestAgent(
      {
        url: path,
        headers: {
          Cookie: ObjectToCookie({
            ...cookie,
            _ga: "GA1.2.137504232.1626799795",
            __atuvc: "2%7C29",
            dom3ic8zudi28v8lr6fgphwffqoz0j6c:
              "5078673e-3373-4183-8147-4ecd268e6e44%3A3%3A1",
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
            _ga: "GA1.2.137504232.1626799795",
            __atuvc: "2%7C29",
            dom3ic8zudi28v8lr6fgphwffqoz0j6c:
              "5078673e-3373-4183-8147-4ecd268e6e44%3A3%3A1",
            waf_cv: this.waf_cv,
          }),
        },
      },
      this.domain
    );
  }
}

module.exports = new Agent();
