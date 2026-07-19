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

fs.rmSync(path.join(distDir, "ai-community-assets"), { recursive: true, force: true });
fs.rmSync(path.join(distDir, "gsc-assets"), { recursive: true, force: true });
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
const ACCOUNT_CSV_URL = "https://docs.google.com/spreadsheets/d/1UpF8ay310CZ1T48iJO8-LZZQhGdZjdwtcBfSLZMM_48/gviz/tq?tqx=out:csv&sheet=%E3%82%A2%E3%82%AB%E3%82%A6%E3%83%B3%E3%83%88";

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

async function handleLoginRequest(request) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "入力内容を確認できませんでした。" }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const secretId = String(body.secretId || "").trim();
  if (!email || !secretId) {
    return jsonResponse({ error: "メールアドレスとIDを入力してください。" }, 400);
  }

  let rows;
  try {
    rows = await fetchAccountRows();
  } catch {
    return jsonResponse({ error: "アカウント台帳に接続できませんでした。" }, 503);
  }

  const account = rows.find((row) => {
    return row.email.toLowerCase() === email && row.secretId === secretId;
  });

  if (!account) {
    return jsonResponse({ error: "登録済みメールアドレスとIDの組み合わせが見つかりません。" }, 401);
  }

  return jsonResponse({
    account: {
      email: account.email,
      secretId: account.secretId,
      role: account.role,
      linkedStudentIds: linkedStudentsFor(account.role)
    }
  });
}

async function fetchAccountRows() {
  const response = await fetch(ACCOUNT_CSV_URL, {
    headers: { "Accept": "text/csv,text/plain,*/*" }
  });
  if (!response.ok) {
    throw new Error("Account sheet fetch failed");
  }

  const csv = await response.text();
  const rows = parseCsv(csv);
  const header = rows.shift() || [];
  const emailIndex = header.indexOf("メールアドレス");
  const roleIndex = header.indexOf("権限");
  const idIndex = header.indexOf("ID");

  if (emailIndex < 0 || roleIndex < 0 || idIndex < 0) {
    throw new Error("Account sheet headers are invalid");
  }

  return rows
    .map((row) => {
      return {
        email: String(row[emailIndex] || "").trim(),
        role: roleFor(String(row[roleIndex] || "").trim()),
        secretId: String(row[idIndex] || "").trim()
      };
    })
    .filter((row) => row.email && row.role && row.secretId);
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((char === "\\n" || char === "\\r") && !inQuotes) {
      if (char === "\\r" && next === "\\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

function roleFor(label) {
  if (label === "管理者") return "admin";
  if (label === "講師") return "teacher";
  if (label === "生徒") return "student";
  if (label === "保護者") return "parent";
  return "";
}

function linkedStudentsFor(role) {
  if (role === "admin" || role === "teacher") return ["student-hinata", "student-ren"];
  return ["student-hinata"];
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...COMMON_HEADERS, "Content-Type": "application/json; charset=utf-8" }
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/login") {
      return handleLoginRequest(request);
    }
    if (url.pathname === "/") {
      url.pathname = "/jyuku";
      return Response.redirect(url.toString(), 302);
    }
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
