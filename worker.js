const { parentPort, threadId } = require("worker_threads");
const axios = require("axios").default;
const { parse } = require("node-html-parser");

parentPort.on("message", async (data) => {
  await axios
    .get(data.task, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:99.0) Gecko/20100101 Firefox/99.0",
      },
    })
    .then((response) => {
      let linkSet = new Set();

      if (response.status === 200) {
        const html = response.data;
        const root = parse(html);
        const links = root.getElementsByTagName("a");

        for (let link of links) {
          let href = link.getAttribute("href");

          if (String(href).startsWith("/#") || String(href).startsWith("/")) {
            const relativeLink = data.baseUrl.concat("", href.slice(1));
            linkSet.add(relativeLink);
          } else if (
            String(href).includes(data.task) &&
            String(href) !== data.baseUrl
          ) {
            linkSet.add(href);
          }
        }
        parentPort.postMessage(linkSet);
      }
    })
    .catch((e) => {
      console.log("Worker error");
      parentPort.postMessage(new Set());
    });
});
