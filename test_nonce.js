const http = require("http");
function getNonce() {
  return new Promise(resolve => {
    http.get("http://localhost:3000/epaper", (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        const m = data.match(/nonce="([^"]+)"/);
        resolve({
          nonce: m ? m[1] : null,
          csp: res.headers["content-security-policy"]
        });
      });
    });
  });
}
async function test() {
  const http = require("http");
  return new Promise(resolve => {
    http.get("http://localhost:3000/epaper", (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        const cspNonce = res.headers["content-security-policy"].match(/nonce-([^' ]+)/)?.[1];
        const scripts = data.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gi) || [];
        let badScripts = [];
        scripts.forEach(s => {
          if (!s.includes('nonce="' + cspNonce + '"')) badScripts.push(s);
        });
        console.log("Total scripts:", scripts.length);
        console.log("Scripts without matching nonce:", badScripts.length);
        badScripts.forEach(s => console.log(s.substring(0, 150)));
        resolve();
      });
    });
  });
}
test();
