const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const required = [
  ".nojekyll",
  "index.html",
  "styles.css",
  "app.js",
  "sw.js",
  "manifest.webmanifest",
  "assets/lucide.min.js",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/water-texture.svg"
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  throw new Error(`Missing files: ${missing.join(", ")}`);
}

JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
new vm.Script(fs.readFileSync(path.join(root, "app.js"), "utf8"), { filename: "app.js" });
new vm.Script(fs.readFileSync(path.join(root, "sw.js"), "utf8"), { filename: "sw.js" });

console.log("Static checks passed.");
