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
const md = s => esc(s || "")
  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/\[\[([^\]]+)\]\]/g, "$1");

// --- parse: sprint ---
const sprint = sec("Current sprint").replace(/^Goal:\s*/i, "").trim();

// --- parse: offer options (the M0 breakdown) ---
const offerSec = sec("THE decision");
const offerIntro = (offerSec.split("\n").find(l => l.trim() && !l.trim().startsWith("-")) || "").trim();
const offerOptions = offerSec.split("\n").map(l => l.trim())
  .filter(l => /^-\s*[A-D]\)/.test(l))
  .map(l => {
    const letter = (l.match(/^-\s*([A-D])\)/) || [])[1];
    const rest = l.replace(/^-\s*[A-D]\)\s*/, "");
    const name = (rest.match(/\*\*(.+?)\*\*/) || [])[1] || "";
    const desc = rest.replace(/\*\*.+?\*\*\s*[-–]?\s*/, "").trim();
    return { letter, name, desc };
  });
const offerRec = (offerSec.split("\n").find(l => /^Recommendation/i.test(l.trim())) || "").trim();

// --- parse: milestones (with descriptions) ---
const msRaw = sec("Milestones to market");
const milestones = msRaw.split("\n").map(l => l.trim())
  .filter(l => /^-\s*\*\*M\d/.test(l))
  .map(l => {
    const id = "M" + (l.match(/M(\d)/) || [])[1];
    const title = (l.match(/\*\*M\d\s*[-–]\s*([^*]+?)\.?\*\*/) || [])[1] || "";
    const desc = l.replace(/^-\s*\*\*M\d\s*[-–][^*]+\*\*\s*/, "").trim();
    const done = /\bdone\b|✓/i.test(l.replace(/\*\*/g, ""));
    return { id, title: title.trim(), desc, done };
  });
const currentIdx = milestones.findIndex(m => !m.done);
milestones.forEach((m, i) => m.state = m.done ? "done" : (i === currentIdx ? "current" : "todo"));
// detail body per milestone: M0 gets the offer options; others get their description
const msDetail = {};
milestones.forEach(m => {
  if (m.id === "M0" && offerOptions.length) {
    msDetail.M0 = `<p class="d-intro">${md(offerIntro)}</p>` +
      `<div class="opts">` + offerOptions.map(o =>
        `<div class="opt"><span class="ltr">${o.letter}</span><div><b>${esc(o.name)}</b><span>${md(o.desc)}</span></div></div>`).join("") +
      `</div>` + (offerRec ? `<p class="rec">${md(offerRec)}</p>` : "");
  } else {
    msDetail[m.id] = `<p class="d-intro">${md(m.desc) || "No detail yet."}</p>`;
  }
});

// --- parse: tasks (numbered in Next 3 actions) ---
const tasks = sec("Next 3 actions").split("\n").map(l => l.trim())
  .filter(l => /^\d+[.)]/.test(l))
  .map(l => {
    let t = l.replace(/^\d+[.)]\s*/, "");
    const tag = (t.match(/\[(M\d)\]/) || [])[1] || "";
    t = t.replace(/\s*\[M\d\]\s*/g, "").trim();
    return { text: t, tag };
  });
const taskDetail = (t) => {
  const ms = milestones.find(m => m.id === t.tag);
  let body = "";
  if (ms) body += `<p class="why">Part of <b>${ms.id} - ${esc(ms.title)}</b></p>`;
  body += (msDetail[t.tag] || `<p class="d-intro">Open the milestone below for context.</p>`);
  return body;
};

// --- parse: recent activity ---
const acts = [];
sec("Running log").split(/\n-\s*/).forEach(chunk => {
  const m = chunk.replace(/^-\s*/, "").match(/^(\d{4}-\d{2}-\d{2}):\s*([\s\S]*)/);
  if (m) {
    let body = m[2].replace(/\s+/g, " ").trim();
    if (body.length > 180) body = body.slice(0, 177).replace(/\s+\S*$/, "") + "…";
    acts.push({ date: m[1], body });
  }
});
// log is newest-first in the file; keep that order so Recent activity shows newest first

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
h1{font-size:2rem;margin:0;letter-spacing:.04em;font-weight:800}
header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:6px}
.tag-week{font-size:.72rem;color:var(--mute)}
.lede{color:var(--mute);font-size:.82rem;margin:0 0 22px}
.hint{color:var(--mute);font-size:.74rem;margin:-8px 0 16px}
strong,b{color:var(--cream)}
[overflow]{}
.now .task,.t,.sprint,.ms-row .ttl,.activity .b,.d-intro,.opt{overflow-wrap:break-word;word-break:break-word}

.now{background:linear-gradient(135deg,#2a1840,#3a1c38);border:1px solid #5a2b50;border-radius:18px;padding:20px;margin-bottom:14px}
.now .kicker{font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;color:var(--coral);font-weight:700;margin-bottom:8px}
.now .task{font-size:1.3rem;font-weight:700;line-height:1.35}
.now .chip{display:inline-block;margin-top:14px;font-size:.7rem;font-weight:700;letter-spacing:.08em;
 background:rgba(232,115,90,.18);color:#ffb9a6;border:1px solid rgba(232,115,90,.4);padding:4px 10px;border-radius:999px}

.grid{display:grid;grid-template-columns:1fr;gap:18px}
@media(min-width:760px){.grid{grid-template-columns:1.25fr 1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 16px}
.card h2{margin:4px 4px 6px;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);font-weight:700}

/* accordion (tasks + milestones share .acc) */
.acc{border-top:1px solid var(--line)}
.acc:first-of-type{border-top:0}
details>summary{list-style:none;cursor:pointer;display:flex;gap:11px;align-items:flex-start;padding:13px 6px}
details>summary::-webkit-details-marker{display:none}
.box{flex:0 0 20px;height:20px;border:2px solid #6a5a82;border-radius:6px;margin-top:1px}
.t{flex:1;font-size:1rem;line-height:1.4}
.chev{flex:0 0 auto;color:var(--mute);transition:transform .2s;margin-top:2px}
details[open] .chev{transform:rotate(90deg)}
.mini{display:inline-block;font-size:.62rem;font-weight:700;letter-spacing:.06em;color:var(--gold);
 border:1px solid rgba(232,165,85,.4);padding:1px 7px;border-radius:999px;margin-left:6px;vertical-align:middle}
.detail{padding:2px 6px 16px 37px;font-size:.9rem;color:#d6c9e8}
.detail .why{margin:0 0 10px;font-size:.8rem;color:var(--mute)}
.d-intro{margin:0 0 12px;line-height:1.5}
.opts{display:flex;flex-direction:column;gap:8px}
.opt{display:flex;gap:10px;background:#181225;border:1px solid var(--line);border-radius:10px;padding:9px 11px}
.opt .ltr{flex:0 0 22px;height:22px;border-radius:6px;background:rgba(232,115,90,.18);color:#ffb9a6;
 font-weight:800;font-size:.8rem;display:flex;align-items:center;justify-content:center}
.opt b{display:block;color:var(--cream);font-size:.92rem}
.opt span{display:block;color:var(--mute);font-size:.82rem;line-height:1.4;margin-top:2px}
.rec{margin:12px 0 0;padding:10px 12px;background:rgba(88,200,56,.1);border:1px solid rgba(88,200,56,.3);
 border-radius:10px;font-size:.85rem;color:#cfeac0}

.ms-row{display:flex;gap:11px;align-items:flex-start;padding:11px 6px}
.dot{flex:0 0 14px;height:14px;border-radius:50%;margin-top:3px;border:2px solid #6a5a82;background:transparent}
.acc.done .dot{background:var(--green);border-color:var(--green)}
.acc.current .dot{background:var(--coral);border-color:var(--coral);box-shadow:0 0 0 4px rgba(232,115,90,.2)}
.ms-row .ttl{flex:1;font-size:.95rem;line-height:1.3}
.ms-row .ttl b{color:var(--cream)}
.acc.todo .ms-row .ttl{color:var(--mute)}
.here{font-size:.58rem;font-weight:700;letter-spacing:.1em;color:var(--coral);display:block;margin-top:2px}

.sprint{font-size:1.04rem;line-height:1.45;font-weight:600;padding:2px 4px}
.activity{list-style:none;margin:0;padding:0}
.activity li{padding:9px 0 9px 14px;border-left:2px solid var(--line);margin-bottom:2px}
.activity .d{font-size:.66rem;color:var(--gold);letter-spacing:.06em;font-weight:700}
.activity .b{font-size:.84rem;color:#cdbfe0;line-height:1.4;margin-top:2px}
.foot{margin-top:30px;text-align:center;font-size:.7rem;color:#5f5275}
a{color:var(--coral)}
@media(max-width:480px){html{font-size:16px}h1{font-size:1.7rem}.now .task{font-size:1.12rem}}
.capture textarea{width:100%;min-height:84px;background:#181225;border:1px solid var(--line);border-radius:10px;
 color:var(--cream);padding:11px;font:inherit;font-size:.92rem;resize:vertical}
.caprow{display:flex;gap:8px;margin-top:9px}
.caprow select{flex:1;min-width:0;background:#181225;border:1px solid var(--line);border-radius:10px;color:var(--cream);padding:9px;font:inherit;font-size:.82rem}
.caprow button{flex:0 0 auto;background:var(--coral);color:#fff;border:0;border-radius:10px;padding:9px 22px;font:inherit;font-weight:700;cursor:pointer}
.caprow button:disabled{opacity:.5}
#capStatus{font-size:.78rem;margin-top:8px;min-height:1.1em}
#capStatus.ok{color:var(--green)}#capStatus.err{color:#ff8a8a}
</style></head><body>

<header><h1>VEIT</h1><span class="tag-week">${esc(sprint ? "this week" : "")}</span></header>
<p class="lede">Live status. Auto-updated by your Coach and Partner.</p>

${topTask ? `<div class="now">
  <div class="kicker">Do this now</div>
  <div class="task">${md(topTask.text)}</div>
  ${topTask.tag ? `<span class="chip">${topTask.tag}</span>` : ""}
</div>` : ""}
<p class="hint">Tap any task or milestone to read what it means.</p>

<div class="grid">
  <div class="col">
    <div class="card">
      <h2>This week's tasks</h2>
      ${tasks.map(t => `<details class="acc"><summary><span class="box"></span><span class="t">${md(t.text)}${t.tag ? `<span class="mini">${t.tag}</span>` : ""}</span><span class="chev">&#9656;</span></summary><div class="detail">${taskDetail(t)}</div></details>`).join("") || "<p class='detail'>No tasks yet.</p>"}
    </div>
    <div class="card" style="margin-top:18px">
      <h2>Sprint goal</h2>
      <div class="sprint">${md(sprint) || "-"}</div>
    </div>
  </div>

  <div class="col">
    <div class="card">
      <h2>Road to market</h2>
      ${milestones.map(m => `<details class="acc ${m.state}"><summary><span class="dot"></span><span class="ttl"><b>${m.id}</b> ${esc(m.title)}${m.state === "current" ? '<span class="here">YOU ARE HERE</span>' : ""}</span><span class="chev">&#9656;</span></summary><div class="detail">${msDetail[m.id] || ""}</div></details>`).join("")}
    </div>
    <div class="card" style="margin-top:18px">
      <h2>Recent activity</h2>
      <ul class="activity">
        ${acts.slice(0, 4).map(a => `<li><div class="d">${a.date}</div><div class="b">${md(a.body)}</div></li>`).join("") || "<li><div class='b'>Nothing yet.</div></li>"}
      </ul>
    </div>
  </div>
</div>

<div class="foot">VEIT Company OS &middot; updates via Claude in terminal</div>
</body></html>`;

fs.writeFileSync(process.argv[4], html);
console.log("rendered " + process.argv[4]);
