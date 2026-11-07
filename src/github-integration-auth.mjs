/** Fixed-host, bounded GitHub App discovery. Credentials never enter D1 or responses. */
const enc = new TextEncoder();
const b64 = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
const json64 = (value) => b64(enc.encode(JSON.stringify(value)));
export const positiveId = (n) => Number.isSafeInteger(n) && n > 0;
export const configuredGithubApp = (env) =>
  typeof env.GITHUB_APP_ID === "string" &&
  /^[A-Za-z0-9_.-]{1,80}$/.test(env.GITHUB_APP_ID) &&
  positiveId(Number(env.GITHUB_INSTALLATION_ID)) &&
  typeof env.GITHUB_APP_PRIVATE_KEY === "string" &&
  env.GITHUB_APP_PRIVATE_KEY.includes("BEGIN PRIVATE KEY");

async function boundedJson(response, max = 524288) {
  if (
    !response.ok ||
    !/application\/json/i.test(response.headers.get("Content-Type") || "")
  )
    throw Error("GitHub unavailable");
  const reader = response.body?.getReader();
  if (!reader) throw Error("GitHub unavailable");
  const parts = [];
  let size = 0;
  try {
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.length;
      if (size > max) {
        await reader.cancel();
        throw Error("GitHub response too large");
      }
      parts.push(r.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let i = 0;
  for (const p of parts) {
    bytes.set(p, i);
    i += p.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function githubAppJwt(env, at) {
  if (!configuredGithubApp(env)) throw Error("GitHub App not configured");
  const pem = env.GITHUB_APP_PRIVATE_KEY;
  const begin = ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
    end = ["-----END", "PRIVATE KEY-----"].join(" ");
  if (
    pem.length > 16384 ||
    !pem.startsWith(begin) ||
    !pem.trimEnd().endsWith(end)
  )
    throw Error("Invalid private key");
  const keyBody = pem.trimEnd().slice(begin.length, -end.length);
  if (!/^[A-Za-z0-9+/=\s]+$/.test(keyBody)) throw Error("Invalid private key");
  const data = Uint8Array.from(atob(keyBody.replace(/\s/g, "")), (c) =>
    c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    data,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(at / 1000),
    body =
      json64({ alg: "RS256", typ: "JWT" }) +
      "." +
      json64({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_ID });
  return (
    body +
    "." +
    b64(
      new Uint8Array(
        await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(body)),
      ),
    )
  );
}
export async function discoverGithubRepositories(env, at, fetcher = fetch) {
  const id = Number(env.GITHUB_INSTALLATION_ID),
    jwt = await githubAppJwt(env, at);
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "devonakins-github-app",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const installation = await boundedJson(
    await fetcher("https://api.github.com/app/installations/" + id, {
      headers: { ...headers, Authorization: "Bearer " + jwt },
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    }),
  );
  if (
    installation.id !== id ||
    installation.account?.login !== "devonalanakins" ||
    installation.suspended_at
  )
    throw Error("Installation unavailable");
  const auth = await boundedJson(
    await fetcher(
      "https://api.github.com/app/installations/" + id + "/access_tokens",
      {
        method: "POST",
        headers: {
          ...headers,
          Authorization: "Bearer " + jwt,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissions: { metadata: "read", actions: "read" },
        }),
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      },
    ),
  );
  if (
    typeof auth.token !== "string" ||
    auth.token.length > 512 ||
    !/^ghs_[A-Za-z0-9_]+$/.test(auth.token) ||
    !Number.isFinite(Date.parse(auth.expires_at)) ||
    Date.parse(auth.expires_at) <= at
  )
    throw Error("Installation unavailable");
  const result = [];
  for (let page = 1; page <= 5; page++) {
    const data = await boundedJson(
      await fetcher(
        "https://api.github.com/installation/repositories?per_page=100&page=" +
          page,
        {
          headers: { ...headers, Authorization: "Bearer " + auth.token },
          redirect: "error",
          signal: AbortSignal.timeout(10000),
        },
      ),
    );
    if (
      !Number.isSafeInteger(data.total_count) ||
      data.total_count < 0 ||
      data.total_count > 500 ||
      !Array.isArray(data.repositories) ||
      data.repositories.length > 100
    )
      throw Error("Repository inventory unavailable");
    result.push(...data.repositories);
    if (result.length >= data.total_count) {
      if (result.length !== data.total_count)
        throw Error("Repository inventory changed");
      return result;
    }
    if (data.repositories.length === 0)
      throw Error("Repository inventory changed");
  }
  throw Error("Repository inventory too large");
}
