// VEIT capture Worker (Cloudflare). Receives a submission from the status page
// and appends it to inbox.md in the private veit repo via the GitHub API.
// SETUP: set GH_TOKEN below to a GitHub fine-grained PAT with Contents:Read+Write on pietsuess/veit.
const GH_TOKEN = "PASTE_YOUR_GITHUB_TOKEN_HERE";
const REPO = "pietsuess/veit";
const FILE = "inbox.md";

export default {
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": "https://arcade.pietsuess.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("POST only", { status: 405, headers: cors });

    let body;
    try { body = await req.json(); } catch { return new Response("bad json", { status: 400, headers: cors }); }
    const text = (body.text || "").toString().slice(0, 4000).trim();
    const task = (body.task || "").toString().slice(0, 80).trim();
    if (!text) return new Response("empty", { status: 400, headers: cors });

    const api = `https://api.github.com/repos/${REPO}/contents/${FILE}`;
    const h = { "Authorization": `Bearer ${GH_TOKEN}`, "User-Agent": "veit-capture", "Accept": "application/vnd.github+json" };

    // read current inbox (if any)
    let existing = "", sha;
    const get = await fetch(api, { headers: h });
    if (get.status === 200) { const j = await get.json(); sha = j.sha; existing = atob(j.content.replace(/\n/g, "")); }

    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    const entry = `\n- [${stamp}]${task ? ` (${task})` : ""}: ${text}\n`;
    const updated = (existing || "# Inbox\nUnprocessed updates from Piet. The agent folds these into Company-OS.md and clears this file.\n") + entry;

    const put = await fetch(api, {
      method: "PUT", headers: { ...h, "Content-Type": "application/json" },
      body: JSON.stringify({ message: `capture: ${stamp}`, content: btoa(unescape(encodeURIComponent(updated))), sha })
    });
    if (!put.ok) return new Response("save failed: " + put.status, { status: 502, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  }
};
