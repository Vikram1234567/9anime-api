const axios = require("axios");
async function requestAgent(options, domain) {
  const { url = "", headers, ...otherOptions } = options;
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

    setInterval(async () => {
      this.waf_cv = await getWaf(this.domain);
    }, 8642000);
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
