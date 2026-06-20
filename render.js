// Renders status.html from the veit repo's Company-OS.md + latest-message.md.
// Run with paths: node render.js <company-os.md> <latest-message.md> <out.html>
const fs = require("fs");
const os = fs.readFileSync(process.argv[2], "utf8");
let latest = ""; try { latest = fs.readFileSync(process.argv[3], "utf8"); } catch(e){}
const sec = (name) => {
  const re = new RegExp("##+\\s*" + name + "[\\s\\S]*?(?=\\n##\\s|$)", "i");
  const m = os.match(re); return m ? m[0].replace(/^##+.*\n/, "").trim() : "";
};
const esc = s => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const sprint = sec("Current sprint");
const actions = sec("Next 3 actions");
const log = sec("Running log");
const logLines = log.split("\n").filter(l=>l.trim().startsWith("-")).slice(-8).reverse();
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VEIT Status</title><style>
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,system-ui,sans-serif;
background:#15101f;color:#f4efe6;padding:20px;line-height:1.5}
h1{font-size:1.8rem;margin:0 0 2px}.sub{opacity:.5;font-size:.8rem;margin-bottom:22px}
.card{background:#1f1830;border:1px solid #34294a;border-radius:14px;padding:16px 18px;margin-bottom:16px}
.card h2{margin:0 0 10px;font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:#e8a555}
.nudge{white-space:pre-wrap;font-size:1rem}
ul{margin:0;padding-left:20px}li{margin:6px 0}
.log li{opacity:.7;font-size:.85rem;list-style:none;padding-left:0;border-left:2px solid #4a3f5a;padding:2px 0 2px 12px}
a{color:#e8735a}</style></head><body>
<h1>VEIT</h1><div class="sub">Live status. Auto-updated by your agents.</div>
<div class="card"><h2>Today's nudge</h2><div class="nudge">${esc(latest||"No nudge yet.")}</div></div>
<div class="card"><h2>Current sprint</h2><div>${esc(sprint||"-")}</div></div>
<div class="card"><h2>Next actions</h2><div class="nudge">${esc(actions||"-")}</div></div>
<div class="card log"><h2>Recent progress</h2><ul>${logLines.map(l=>`<li>${esc(l.replace(/^-\s*/,""))}</li>`).join("")||"<li>-</li>"}</ul></div>
</body></html>`;
fs.writeFileSync(process.argv[4], html);
console.log("rendered " + process.argv[4]);
