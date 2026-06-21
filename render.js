// Renders index.html from the veit repo's Company-OS.md + latest-message.md.
// Usage: node render.js <company-os.md> <latest-message.md> <out.html>
const fs = require("fs");
const os = fs.readFileSync(process.argv[2], "utf8");
let latest = ""; try { latest = fs.readFileSync(process.argv[3], "utf8"); } catch (e) {}

// --- helpers ---
const sec = (name) => {
  const re = new RegExp("##+\\s*" + name + "[\\s\\S]*?(?=\\n##\\s|$)", "i");
  const m = os.match(re); return m ? m[0].replace(/^##+.*\n/, "").trim() : "";
};
const esc = s => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// inline markdown -> html (bold, strip backticks, [[wikilinks]], stray markers)
const md = s => esc(s || "")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/\[\[([^\]]+)\]\]/g, "$1");

// --- parse data ---
const sprint = sec("Current sprint").replace(/^Goal:\s*/i, "").trim();

// tasks: numbered lines in "Next 3 actions"; pull [Mx] tag out as a chip
const actionsRaw = sec("Next 3 actions");
const tasks = actionsRaw.split("\n")
  .map(l => l.trim())
  .filter(l => /^\d+[.)]/.test(l))
  .map(l => {
    let t = l.replace(/^\d+[.)]\s*/, "");
    const tag = (t.match(/\[(M\d)\]/) || [])[1] || "";
    t = t.replace(/\s*\[M\d\]\s*/g, "").trim();
    return { text: t, tag };
  });

// milestones: lines like "- **M0 - Define the offer.** ..."; mark done if line has [done]/DONE/✓
const msRaw = sec("Milestones to market");
const milestones = msRaw.split("\n")
  .map(l => l.trim())
  .filter(l => /^-\s*\*\*M\d/.test(l))
  .map(l => {
    const id = (l.match(/M(\d)/) || [])[1];
    const title = (l.match(/\*\*M\d\s*[-–]\s*([^*.]+)/) || [])[1] || "";
    const done = /\[done\]|done\b|✓/i.test(l.replace(/\*\*/g, ""));
    return { id: "M" + id, title: title.trim(), done };
  });
// current = first not-done
const currentIdx = milestones.findIndex(m => !m.done);
milestones.forEach((m, i) => m.state = m.done ? "done" : (i === currentIdx ? "current" : "todo"));

// recent activity: split log by date, newest first, trim each
const log = sec("Running log");
const acts = [];
log.split(/\n-\s*/).forEach(chunk => {
  const m = chunk.match(/^(\d{4}-\d{2}-\d{2}):\s*([\s\S]*)/);
  if (m) {
    let body = m[2].replace(/\s+/g, " ").trim();
    if (body.length > 160) body = body.slice(0, 157).replace(/\s+\S*$/, "") + "…";
    acts.push({ date: m[1], body });
  }
});
acts.reverse();

const topTask = tasks[0];

// --- html ---
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#15101f">
<title>VEIT Status</title><style>
*{box-sizing:border-box}
:root{--bg:#15101f;--card:#1f1830;--line:#34294a;--cream:#f4efe6;--gold:#e8a555;--coral:#e8735a;--green:#58c838;--mute:#9a8bb0}
html{font-size:17px}
body{margin:0;font-family:-apple-system,system-ui,"Segoe UI",sans-serif;background:var(--bg);color:var(--cream);
 -webkit-font-smoothing:antialiased;padding:22px 18px 60px;max-width:1100px;margin:0 auto;overflow-x:hidden}
.now .task,.task-list .t,.sprint,.step .ms,.activity .b{overflow-wrap:break-word;word-break:break-word}
header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px}
h1{font-size:2rem;margin:0;letter-spacing:.04em;font-weight:800}
.tag-week{font-size:.72rem;color:var(--mute)}
.lede{color:var(--mute);font-size:.82rem;margin:0 0 22px}

.now{background:linear-gradient(135deg,#2a1840,#3a1c38);border:1px solid #5a2b50;border-radius:18px;padding:20px 20px 22px;margin-bottom:22px}
.now .kicker{font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--coral);font-weight:700;margin-bottom:8px}
.now .task{font-size:1.32rem;font-weight:700;line-height:1.35}
.now .chip{display:inline-block;margin-top:14px;font-size:.7rem;font-weight:700;letter-spacing:.08em;
 background:rgba(232,115,90,.18);color:#ffb9a6;border:1px solid rgba(232,115,90,.4);padding:4px 10px;border-radius:999px}

.grid{display:grid;grid-template-columns:1fr;gap:18px}
@media(min-width:760px){.grid{grid-template-columns:1.3fr 1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px 20px}
.card h2{margin:0 0 14px;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:700}

.task-list{list-style:none;margin:0;padding:0}
.task-list li{display:flex;gap:12px;align-items:flex-start;padding:11px 0;border-top:1px solid var(--line)}
.task-list li:first-child{border-top:0;padding-top:0}
.box{flex:0 0 20px;height:20px;border:2px solid #6a5a82;border-radius:6px;margin-top:2px}
.task-list .t{flex:1;font-size:1rem;line-height:1.4}
.mini{display:inline-block;font-size:.62rem;font-weight:700;letter-spacing:.06em;color:var(--gold);
 border:1px solid rgba(232,165,85,.4);padding:1px 7px;border-radius:999px;margin-left:6px;vertical-align:middle}

.track{display:flex;flex-direction:column;gap:0}
.step{display:flex;gap:12px;align-items:flex-start;position:relative;padding-bottom:16px}
.step:last-child{padding-bottom:0}
.dot{flex:0 0 14px;height:14px;border-radius:50%;margin-top:3px;border:2px solid #6a5a82;background:transparent;z-index:1}
.step.done .dot{background:var(--green);border-color:var(--green)}
.step.current .dot{background:var(--coral);border-color:var(--coral);box-shadow:0 0 0 4px rgba(232,115,90,.2)}
.step:not(:last-child):before{content:"";position:absolute;left:6px;top:18px;bottom:0;width:2px;background:var(--line)}
.step .ms{font-size:.93rem;line-height:1.3}
.step .ms b{color:var(--cream)}
.step.todo .ms{color:var(--mute)}
.step.current .ms b{color:#ffb9a6}
.step .now-tag{font-size:.6rem;font-weight:700;letter-spacing:.1em;color:var(--coral);display:block;margin-top:1px}

.sprint{font-size:1.05rem;line-height:1.45;font-weight:600}
.activity{list-style:none;margin:0;padding:0}
.activity li{padding:9px 0 9px 14px;border-left:2px solid var(--line);margin-bottom:2px}
.activity .d{font-size:.66rem;color:var(--gold);letter-spacing:.06em;font-weight:700}
.activity .b{font-size:.84rem;color:#cdbfe0;line-height:1.4;margin-top:2px}
.foot{margin-top:30px;text-align:center;font-size:.7rem;color:#5f5275}
a{color:var(--coral)}
@media(max-width:480px){html{font-size:16px}h1{font-size:1.7rem}.now{padding:18px}.now .task{font-size:1.12rem}.card{padding:16px}}
</style></head><body>

<header><h1>VEIT</h1><span class="tag-week">${esc(sprint ? "this week" : "")}</span></header>
<p class="lede">Live status. Auto-updated by your Coach and Partner.</p>

${topTask ? `<div class="now">
  <div class="kicker">Do this now</div>
  <div class="task">${md(topTask.text)}</div>
  ${topTask.tag ? `<span class="chip">${topTask.tag}</span>` : ""}
</div>` : ""}

<div class="grid">
  <div class="col">
    <div class="card">
      <h2>This week's tasks</h2>
      <ul class="task-list">
        ${tasks.map(t => `<li><span class="box"></span><span class="t">${md(t.text)}${t.tag ? `<span class="mini">${t.tag}</span>` : ""}</span></li>`).join("") || "<li><span class='t'>No tasks yet.</span></li>"}
      </ul>
    </div>
    <div class="card" style="margin-top:18px">
      <h2>Sprint goal</h2>
      <div class="sprint">${md(sprint) || "-"}</div>
    </div>
  </div>

  <div class="col">
    <div class="card">
      <h2>Road to market</h2>
      <div class="track">
        ${milestones.map(m => `<div class="step ${m.state}"><span class="dot"></span><span class="ms"><b>${m.id}</b> ${esc(m.title)}${m.state === "current" ? '<span class="now-tag">YOU ARE HERE</span>' : ""}</span></div>`).join("")}
      </div>
    </div>
    <div class="card" style="margin-top:18px">
      <h2>Recent activity</h2>
      <ul class="activity">
        ${acts.slice(0, 4).map(a => `<li><div class="d">${a.date}</div><div class="b">${md(a.body)}</div></li>`).join("") || "<li><div class='b'>Nothing yet.</div></li>"}
      </ul>
    </div>
  </div>
</div>

<div class="foot">VEIT Company OS</div>
</body></html>`;

fs.writeFileSync(process.argv[4], html);
console.log("rendered " + process.argv[4]);
