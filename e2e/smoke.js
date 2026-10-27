// Browser smoke test of the whole app (customer + admin). See README "Testing".
// Needs a FRESH database with demo data (SEED_DEMO=true), because it pays a bill and blocks a user.
//   BASE=http://localhost:8000  BROWSER_PATH="C:/Program Files/.../chrome.exe"  (or BROWSER_CHANNEL=chrome|msedge)
const { chromium } = require("playwright-core");
const BASE = process.env.BASE || "http://localhost:8000";
const SHOTS = process.env.SHOTS;

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) failures++; };

async function login(page, id, pw) {
  await page.goto(BASE + "/login/");
  await page.fill('input[placeholder="e.g. S10500001"]', id);
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
}

(async () => {
  const browser = await chromium.launch(
    process.env.BROWSER_PATH
      ? { executablePath: process.env.BROWSER_PATH, headless: true }
      : { channel: process.env.BROWSER_CHANNEL || "chrome", headless: true }
  );
  const errors = [];
  const watch = (page) => {
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  };

  // ---- customer ----
  let ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  let page = await ctx.newPage(); watch(page);

  await login(page, "S10500008", "wrong");
  await page.waitForSelector("text=Wrong User ID or password");
  ok(true, "wrong password shows an error");

  await login(page, "S10500008", "demo123");
  await page.waitForSelector("text=Demo Customer");
  ok(await page.isVisible("text=Inactive"), "unpaid customer shows Inactive");
  ok(await page.isVisible("text=Rs 4,500"), "outstanding Rs 4,500 shown");
  if (SHOTS) await page.screenshot({ path: SHOTS + "/customer-unpaid.png" });

  await page.click("text=JazzCash");
  await page.fill('input[placeholder="03XXXXXXXXX"]', "03001234567");
  await page.click('button:has-text("Pay Rs")');
  await page.waitForSelector("text=Payment Successful", { timeout: 10000 });
  ok(true, "JazzCash payment succeeds");
  await page.click('button[aria-label="Close"]');
  await page.waitForSelector("text=Active");
  ok(await page.isVisible("text=Rs 0"), "outstanding drops to Rs 0 and status is Active");
  if (SHOTS) await page.screenshot({ path: SHOTS + "/customer-paid.png" });

  await page.click("text=Transactions");
  await page.waitForSelector("text=Transaction History");
  await page.waitForSelector("button:has(img)");
  const imgOk = await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 800));
    const img = document.querySelector("main img");
    return !!img && img.naturalWidth > 0;
  });
  ok(imgOk, "receipt thumbnail loads through the authenticated endpoint");
  await page.click("main button:has(img)");
  await page.waitForSelector("text=/Receipt ·/");
  ok(true, "receipt viewer opens");
  await ctx.close();

  // ---- admin ----
  ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  page = await ctx.newPage(); watch(page);
  await login(page, "admin", "admin123");
  await page.waitForSelector("h1:has-text('Users')");
  ok(await page.isVisible("text=S10500003"), "admin sees the user table");
  if (SHOTS) await page.screenshot({ path: SHOTS + "/admin-users.png" });

  // customer logged in as non-admin cannot see admin pages: verified in API tests

  // block Hina (not blocked, no receipt this month)
  const row = page.locator("tr", { hasText: "S10500004" });
  await row.locator("button", { hasText: "Block" }).click();
  await page.click('[role="alertdialog"] button:has-text("Block")');
  await page.waitForSelector("tr:has-text('S10500004') >> text=Blocked");
  ok(true, "admin blocks a user (status 1)");

  // dynamic route: open detail by clicking, then by direct URL
  await page.locator("tr", { hasText: "S10500003" }).locator("text=Details").click();
  await page.waitForSelector("h1:has-text('Usman Tariq')");
  ok(page.url().includes("/admin/users/S10500003"), "detail page URL is /admin/users/<id>/");
  if (SHOTS) await page.screenshot({ path: SHOTS + "/admin-detail.png" });
  await page.goto(BASE + "/admin/users/S10500001/");
  await page.waitForSelector("h1:has-text('Ali Raza')");
  ok(true, "direct visit / refresh of /admin/users/<id>/ works");
  await page.locator("tbody tr", { hasText: "Uploaded" }).first().locator("button:has-text('View')").click();
  await page.waitForSelector("text=/Receipt ·/");
  ok(true, "admin opens a user's receipt");
  await page.keyboard.press("Escape");

  await page.goto(BASE + "/admin/receipts/");
  await page.waitForSelector("text=Not uploaded for");
  ok(true, "receipts screen loads");
  await page.goto(BASE + "/admin/activity/");
  await page.waitForSelector("text=user.block");
  ok(await page.isVisible("text=user.block"), "activity log shows the block action");
  ok(await page.isVisible("text=login"), "activity log shows logins");
  if (SHOTS) await page.screenshot({ path: SHOTS + "/admin-activity.png" });

  // logout popup
  await page.click('button[aria-label="Log out"]');
  await page.waitForSelector("text=Log out?");
  await page.click('[role="alertdialog"] button:has-text("Log out")');
  await page.waitForURL("**/login/");
  ok(true, "logout popup then back to login");
  await page.goto(BASE + "/admin/");
  await page.waitForURL("**/login/");
  ok(true, "admin area redirects to login when logged out");
  await ctx.close();

  // ---- blocked customer ----
  ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  page = await ctx.newPage(); watch(page);
  await login(page, "S10500003", "user123");
  await page.waitForSelector("text=Usman Tariq");
  ok(await page.isVisible("text=blocked"), "blocked customer sees the blocked banner");
  // a customer must not get into the admin area
  await page.goto(BASE + "/admin/");
  await page.waitForTimeout(1500);
  ok(!page.url().includes("/admin"), "customer is bounced out of /admin/");
  await ctx.close();

  const relevant = errors.filter((e) => !/favicon|401|403|404/.test(e));
  ok(relevant.length === 0, "no browser console/page errors" + (relevant.length ? ": " + relevant.join(" | ") : ""));
  await browser.close();
  console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error("CRASH", e.message); process.exit(2); });
