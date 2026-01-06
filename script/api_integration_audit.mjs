// script/api_integration_audit.mjs
// Captures every /api request the frontend makes, then replays each request to validate backend integration.
// Writes:
//   reports/api-audit-report.md
//   reports/api-audit-report.json
//
// Required env for authenticated flows
//   SUPER_ADMIN_EMAIL
//   SUPER_ADMIN_PASSWORD
//
// Optional env
//   BASE_URL (default http://localhost:3000)
//   LOGIN_PATH (default /login)
//   HEADLESS (default true)
//   MAX_PAGES (default 12)
//   IGNORE_AUTH_ERRORS (default true)
//   MANIFEST_PATH (default api-manifest.json)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import process from "node:process";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const LOGIN_PATH = process.env.LOGIN_PATH || "/login";
const HEADLESS = (process.env.HEADLESS ?? "true").toLowerCase() !== "false";
const MAX_PAGES = Number(process.env.MAX_PAGES || "12");
const IGNORE_AUTH_ERRORS = (process.env.IGNORE_AUTH_ERRORS ?? "true").toLowerCase() !== "false";
const MANIFEST_PATH = process.env.MANIFEST_PATH || "api-manifest.json";

const EMAIL = process.env.SUPER_ADMIN_EMAIL || "";
const PASSWORD = process.env.SUPER_ADMIN_PASSWORD || "";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sha(input) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function normalizeUrl(u) {
  try {
    const url = new URL(u, BASE_URL);
    url.hash = "";
    return url.toString();
  } catch {
    return u;
  }
}

function toPathKey(fullUrl) {
  const url = new URL(fullUrl);
  return url.pathname + (url.search || "");
}

function safeJsonParse(text) {
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

function guessFix(issue) {
  const { status, method, path: p, errorType } = issue;

  if (errorType === "timeout") {
    return "Backend is slow or blocked, check database calls, external services, and add indexes or caching where needed";
  }
  if (status === 404) {
    return "Route not found, confirm frontend path matches backend route, confirm router mount prefix, and confirm deploy includes the latest server build";
  }
  if (status === 405) {
    return "Method not allowed, confirm the HTTP method used by the frontend matches the backend handler";
  }
  if (status === 400) {
    return "Bad request, validate request body shape and required fields, align frontend payload with backend validation schema";
  }
  if (status === 401 || status === 403) {
    return "Auth or RBAC issue, confirm session cookie or token is present, confirm role permissions, confirm middleware ordering and route protection rules";
  }
  if (status >= 500) {
    return "Server error, inspect server logs for stack trace, add defensive checks, and ensure database queries handle null and missing relations";
  }
  if (errorType === "non_json") {
    return "Frontend expected JSON but backend returned non JSON, verify content type and response serialization";
  }
  if (errorType === "network") {
    return "Network or CORS issue, confirm correct BASE_URL, confirm proxy rules, and confirm allowed origins and credentials settings";
  }

  return `Check the handler for ${method} ${p}, compare request and response contract between frontend and backend`;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${BASE_URL}/`, { method: "GET" });
      if (res.status >= 200 && res.status < 500) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error(`Server not reachable at ${BASE_URL}`);
}

async function tryLogin(page) {
  if (!EMAIL || !PASSWORD) {
    console.log("Login skipped, missing SUPER_ADMIN_EMAIL or SUPER_ADMIN_PASSWORD in env");
    return { didLogin: false, note: "No credentials provided in env" };
  }

  console.log("EMAIL present:", Boolean(EMAIL), "PASSWORD present:", Boolean(PASSWORD));
  console.log("EMAIL length:", EMAIL.length, "PASSWORD length:", PASSWORD.length);

  const loginUrl = `${BASE_URL}${LOGIN_PATH}`;
  console.log("Opening login page:", loginUrl);

  await page.goto(loginUrl, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1000);

  async function fillIfExists(locator, value, label) {
    try {
      if (await locator.count()) {
        await locator.first().fill(value);
        console.log("Filled", label);
        return true;
      }
    } catch {}
    return false;
  }

  const emailOk =
    (await fillIfExists(page.getByLabel(/email/i), EMAIL, "email using label")) ||
    (await fillIfExists(page.getByPlaceholder(/email/i), EMAIL, "email using placeholder")) ||
    (await fillIfExists(page.locator('input[type="email"]'), EMAIL, "email using type=email")) ||
    (await fillIfExists(page.locator('input[name="email"]'), EMAIL, "email using name=email")) ||
    (await fillIfExists(page.locator('input[id="email"]'), EMAIL, "email using id=email")) ||
    (await fillIfExists(page.locator('input[autocomplete="username"]'), EMAIL, "email using autocomplete=username"));

  const passOk =
    (await fillIfExists(page.getByLabel(/password/i), PASSWORD, "password using label")) ||
    (await fillIfExists(page.getByPlaceholder(/password/i), PASSWORD, "password using placeholder")) ||
    (await fillIfExists(page.locator('input[type="password"]'), PASSWORD, "password using type=password")) ||
    (await fillIfExists(page.locator('input[name="password"]'), PASSWORD, "password using name=password")) ||
    (await fillIfExists(page.locator('input[id="password"]'), PASSWORD, "password using id=password")) ||
    (await fillIfExists(page.locator('input[autocomplete="current-password"]'), PASSWORD, "password using autocomplete=current-password"));

  if (!emailOk || !passOk) {
    console.log("Could not find login inputs. emailOk:", emailOk, "passOk:", passOk);

    try {
      const html = await page.content();
      fs.writeFileSync("reports/login-debug.html", html, "utf8");
      await page.screenshot({ path: "reports/login-debug.png", fullPage: true });
      console.log("Saved reports/login-debug.html and reports/login-debug.png");
    } catch {}

    return { didLogin: false, note: "Could not find email or password inputs on login page" };
  }

  const button =
    page.getByRole("button", { name: /sign in|login|log in|continue|next/i }).first();

  if (await button.count()) {
    await button.click();
    console.log("Clicked submit button");
  } else {
    await page.keyboard.press("Enter");
    console.log("Pressed Enter to submit");
  }

  await page.waitForTimeout(2500);

  console.log("URL after login attempt:", page.url());

  const errorText = await page.evaluate(() => {
    const text = document.body ? (document.body.innerText || "") : "";
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const keywords = ["invalid", "incorrect", "unauthorized", "failed", "error", "try again"];
    const hit = lines.find((t) => keywords.some((k) => t.toLowerCase().includes(k)));
    return hit || "";
  });

  if (errorText) console.log("Login page error text found:", errorText);

  return { didLogin: true, note: "Login attempted" };
}


async function crawlAndCapture(page) {
  const visited = new Set();
  const queue = [`${BASE_URL}/`];

  while (queue.length && visited.size < MAX_PAGES) {
    const next = queue.shift();
    if (!next) continue;

    const url = normalizeUrl(next);
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      try {
        await page.waitForLoadState("networkidle", { timeout: 8000 });
      } catch {}

      const links = await page.$$eval("a[href]", (as) =>
        as
          .map((a) => a.getAttribute("href"))
          .filter(Boolean)
          .filter((h) => h.startsWith("/"))
          .filter((h) => !h.startsWith("//"))
          .filter((h) => !h.toLowerCase().includes("logout"))
          .slice(0, 60)
      );

      for (const h of links) {
        const abs = `${BASE_URL}${h}`;
        if (!visited.has(abs) && queue.length < MAX_PAGES * 3) queue.push(abs);
      }
    } catch {}
  }

  return { pagesVisited: visited.size, discoveredPages: Array.from(visited) };
}

function loadManifestIfExists() {
  if (!fs.existsSync(MANIFEST_PATH)) return [];
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter((x) => x && x.method && x.path)
      .map((x) => ({
        source: "manifest",
        method: String(x.method).toUpperCase(),
        path: String(x.path),
        headers: x.headers || {},
        body: x.body ?? null,
        expectedStatus: Array.isArray(x.expectedStatus) ? x.expectedStatus : null,
      }));
  } catch {
    return [];
  }
}

async function main() {
  ensureDir("reports");
  await waitForServer();

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext();
  const page = await context.newPage();

  const captured = new Map();

  page.on("request", (req) => {
    try {
      const url = req.url();
      if (!url.startsWith(BASE_URL)) return;
      if (!url.includes("/api/")) return;
      if (req.method() === "OPTIONS") return;

      const method = req.method();
      const pathKey = toPathKey(url);
      const body = req.postData() || "";
      const headers = req.headers();

      const key = `${method} ${pathKey} ${sha(body)}`;
      if (!captured.has(key)) {
        captured.set(key, {
          source: "ui",
          key,
          method,
          url,
          path: pathKey,
          headers,
          body: body || null,
          firstSeenAt: new Date().toISOString(),
        });
      }
    } catch {}
  });

  const loginInfo = await tryLogin(page);
  // Check login state in the browser itself
  const pageAuthCheck = await page.evaluate(async () => {
    try {
      const r = await fetch("/api/auth/user", { credentials: "include" });
      return { status: r.status, text: await r.text() };
    } catch (e) {
      return { status: -1, text: String(e) };
    }
  });

  console.log("Browser fetch /api/auth/user status:", pageAuthCheck.status);

  const cookieNames = (await context.cookies()).map((c) => c.name);
  console.log("Cookies after login attempt:", cookieNames);


  const meResp = await context.request.get(`${BASE_URL}/api/auth/user`);
  console.log("Auth user status after login attempt:", meResp.status());
  if (meResp.status() === 401) {
    console.log("Login not active. Either login failed or cookie is not being stored or sent.");
  }

  const crawlInfo = await crawlAndCapture(page);

  const manifestItems = loadManifestIfExists();
  for (const item of manifestItems) {
    const full = normalizeUrl(`${BASE_URL}${item.path.startsWith("/") ? "" : "/"}${item.path}`);
    const bodyStr = item.body == null ? "" : typeof item.body === "string" ? item.body : JSON.stringify(item.body);
    const key = `${item.method} ${toPathKey(full)} ${sha(bodyStr)}`;
    if (!captured.has(key)) {
      captured.set(key, {
        source: "manifest",
        key,
        method: item.method,
        url: full,
        path: toPathKey(full),
        headers: item.headers || {},
        body: item.body ?? null,
        expectedStatus: item.expectedStatus ?? null,
        firstSeenAt: new Date().toISOString(),
      });
    }
  }

  const all = Array.from(captured.values());

  const results = [];
  const issues = [];

  for (const item of all) {
    const start = Date.now();
    let status = 0;
    let ok = false;
    let errorType = null;
    let contentType = "";
    let jsonOk = null;
    let responsePreview = null;

    try {
      const headers = { ...(item.headers || {}) };

      delete headers["content-length"];
      delete headers["host"];
      delete headers["origin"];
      delete headers["referer"];

      let bodyToSend = undefined;
      if (item.body != null) {
        if (typeof item.body === "string") bodyToSend = item.body;
        else bodyToSend = JSON.stringify(item.body);
      }

      const resp = await context.request.fetch(item.url, {
        method: item.method,
        headers,
        data: bodyToSend,
        timeout: 30000,
      });

      status = resp.status();
      contentType = resp.headers()["content-type"] || "";

      const text = await resp.text();
      responsePreview = text.slice(0, 600);

      if (contentType.toLowerCase().includes("application/json")) {
        const parsed = safeJsonParse(text);
        jsonOk = parsed.ok;
      } else {
        jsonOk = null;
      }

      const expected = item.expectedStatus;
      if (Array.isArray(expected) && expected.length) {
        ok = expected.includes(status);
      } else {
        ok = status >= 200 && status < 400;
        if (IGNORE_AUTH_ERRORS && (status === 401 || status === 403)) ok = true;
      }

      if (!ok) {
        errorType = contentType.toLowerCase().includes("application/json") && jsonOk === false ? "non_json" : null;
      }
    } catch (e) {
      errorType = String(e).toLowerCase().includes("timeout") ? "timeout" : "network";
      responsePreview = String(e);
      ok = false;
    }

    const ms = Date.now() - start;

    const row = {
      source: item.source,
      method: item.method,
      path: item.path,
      url: item.url,
      status,
      ms,
      ok,
      contentType,
      jsonOk,
      expectedStatus: item.expectedStatus ?? null,
    };

    results.push(row);

    if (!ok) {
      const issue = {
        ...row,
        errorType: errorType || (status >= 500 ? "server" : status >= 400 ? "client" : "unknown"),
        responsePreview,
      };
      issue.suggestedFix = guessFix(issue);
      issues.push(issue);
    }
  }

  await browser.close();

  const summary = {
    baseUrl: BASE_URL,
    login: loginInfo,
    crawl: crawlInfo,
    totals: {
      apisCaptured: results.length,
      apisOk: results.filter((r) => r.ok).length,
      apisWithIssues: issues.length,
    },
    generatedAt: new Date().toISOString(),
  };

  const jsonOut = { summary, results, issues };
  fs.writeFileSync("reports/api-audit-report.json", JSON.stringify(jsonOut, null, 2), "utf8");

  const md = [];
  md.push(`# API integration audit report`);
  md.push(``);
  md.push(`Base URL: ${BASE_URL}`);
  md.push(`Generated: ${summary.generatedAt}`);
  md.push(`Pages visited: ${crawlInfo.pagesVisited}`);
  md.push(`Captured API calls: ${summary.totals.apisCaptured}`);
  md.push(`Issues found: ${summary.totals.apisWithIssues}`);
  md.push(``);
  md.push(`## Issues only`);
  md.push(``);

  if (!issues.length) {
    md.push(`No issues found in captured API calls`);
  } else {
    for (const it of issues) {
      md.push(`### ${it.method} ${it.path}`);
      md.push(`Status: ${it.status}`);
      md.push(`Time: ${it.ms} ms`);
      md.push(`Source: ${it.source}`);
      md.push(`Type: ${it.errorType}`);
      md.push(`Suggested fix: ${it.suggestedFix}`);
      md.push(`Response preview:`);
      md.push("```");
      md.push(String(it.responsePreview || "").slice(0, 600));
      md.push("```");
      md.push(``);
    }
  }

  fs.writeFileSync("reports/api-audit-report.md", md.join("\n"), "utf8");

  process.exitCode = issues.length ? 2 : 0;
}

main().catch((e) => {
  console.error(String(e));
  process.exitCode = 1;
});
