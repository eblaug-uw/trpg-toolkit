const url = process.argv[2] || process.env.DEPLOY_URL;

if (!url) {
  console.error("smoke: DEPLOY_URL is not set and no URL was passed as an argument.");
  process.exit(1);
}

const base = url.endsWith("/") ? url : url + "/";

const failures = [];
let passed = 0;

async function check(name, fn) {
  process.stdout.write(`smoke: ${name} ... `);
  try {
    await fn();
    console.log("OK");
    passed += 1;
  } catch (err) {
    console.log(`FAIL\n   ${err.message}`);
    failures.push({ name, message: err.message });
  }
}

async function fetchWithRetry(target, { retries = 6, delayMs = 5000 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      return await fetch(target, { redirect: "follow" });
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr ?? new Error(`Unable to reach ${target}`);
}

await check("root URL returns HTTP 200", async () => {
  const res = await fetchWithRetry(base);
  if (res.status !== 200) {
    throw new Error(`expected 200, got ${res.status} from ${base}`);
  }
});

await check("HTML payload mounts a React root", async () => {
  const res = await fetchWithRetry(base);
  const html = await res.text();
  if (!/id=["']root["']/.test(html)) {
    throw new Error('response body does not contain id="root"');
  }
});

await check("at least one bundled JS asset is reachable", async () => {
  const res = await fetchWithRetry(base);
  const html = await res.text();
  const match = html.match(/src=["']([^"']+\.js)["']/);
  if (!match) {
    throw new Error("could not find a <script src=...> tag in the HTML");
  }
  const assetUrl = new URL(match[1], base).toString();
  const assetRes = await fetchWithRetry(assetUrl);
  if (assetRes.status !== 200) {
    throw new Error(`asset ${assetUrl} returned ${assetRes.status}`);
  }
});

console.log(`\nsmoke: ${passed} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);