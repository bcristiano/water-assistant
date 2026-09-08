const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  let filePath = path.normalize(decodeURIComponent(url.pathname));

  if (filePath.includes("..")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (filePath === "\\" || filePath === "/") {
    filePath = "index.html";
  }

  const absolute = path.join(root, filePath);
  fs.readFile(absolute, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(absolute)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(data);
  });
});

server.listen(port, () => {
  console.log(`Water app running at http://localhost:${port}`);
});
