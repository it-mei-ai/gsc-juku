import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const serverDir = path.join(distDir, "server");
const hostingSource = path.join(root, ".openai", "hosting.json");
const hostingTarget = path.join(distDir, ".openai", "hosting.json");

if (!fs.existsSync(path.join(distDir, "index.html"))) {
  throw new Error("dist/index.html was not found. Run vite build before generating the Sites worker.");
}

if (!fs.existsSync(hostingSource)) {
  throw new Error(".openai/hosting.json was not found.");
}

fs.rmSync(serverDir, { recursive: true, force: true });
fs.mkdirSync(serverDir, { recursive: true });
fs.mkdirSync(path.dirname(hostingTarget), { recursive: true });
fs.copyFileSync(hostingSource, hostingTarget);

const assets = {};

for (const file of walk(distDir)) {
  const relative = path.relative(distDir, file);
  if (relative.startsWith(`server${path.sep}`) || relative.startsWith(`.openai${path.sep}`)) continue;

  const route = `/${relative.split(path.sep).join("/")}`;
  assets[route] = {
    contentType: contentTypeFor(file),
    bodyBase64: fs.readFileSync(file).toString("base64"),
    cacheControl: route === "/index.html" ? "no-cache" : "public, max-age=31536000, immutable"
  };
}

const serverSource = `const ASSETS = ${JSON.stringify(assets)};

const COMMON_HEADERS = {
  "X-Content-Type-Options": "nosniff"
};

function bytesFromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function routeFor(url) {
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") return "/index.html";
  if (ASSETS[pathname]) return pathname;
  if (!pathname.includes(".")) return "/index.html";
  return pathname;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const route = routeFor(url);
    const asset = ASSETS[route];

    if (!asset) {
      return new Response("Not found", {
        status: 404,
        headers: { ...COMMON_HEADERS, "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    const headers = {
      ...COMMON_HEADERS,
      "Cache-Control": asset.cacheControl,
      "Content-Type": asset.contentType
    };

    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers });
    }

    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { ...COMMON_HEADERS, "Content-Type": "text/plain; charset=utf-8" }
      });
    }

    return new Response(bytesFromBase64(asset.bodyBase64), { status: 200, headers });
  }
};
`;

fs.writeFileSync(path.join(serverDir, "index.js"), serverSource);
console.log(`Generated Sites worker with ${Object.keys(assets).length} assets.`);

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
    } else if (entry.isFile()) {
      yield fullPath;
    }
  }
}

function contentTypeFor(file) {
  const extension = path.extname(file).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml; charset=utf-8",
    ".ico": "image/x-icon",
    ".txt": "text/plain; charset=utf-8",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
  };

  return types[extension] ?? "application/octet-stream";
}
