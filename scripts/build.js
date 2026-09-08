const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const files = [
  "index.html",
  "styles.css",
  "app.js",
  "sw.js",
  "manifest.webmanifest"
];
const assets = [
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "water-texture.svg",
  "lucide.min.js"
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });

files.forEach((file) => {
  fs.copyFileSync(path.join(root, file), path.join(dist, file));
});

assets.forEach((file) => {
  fs.copyFileSync(path.join(root, "assets", file), path.join(dist, "assets", file));
});

console.log(`Built static site in ${dist}`);
