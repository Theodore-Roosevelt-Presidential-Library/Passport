// T.R. Passport — app shell, router and views
(function () {
  const $app = document.getElementById("app");
  const DIRECTORY = "https://directory.labs.trlibrary.com";
  let DATA = null;
  const SITE = {}; const REGION = {};

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const stickerSrc = (s) => s.sticker || "assets/badges/_generic.webp";
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const inkFor = (site) => (REGION[site.region] || {}).color || "#092A4D";
  const rotFor = (visit) => (Cancel.hash(visit.id) % 26) - 13;
  const isTR = (s) => s.trTypes && s.trTypes.length;
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const CANCEL_CACHE = new Map();
  function cancelURL(site, visit, px) {
    const key = visit.id + ":" + (px || 320);
    if (!CANCEL_CACHE.has(key)) CANCEL_CACHE.set(key, Cancel.toDataURL({
      top: site.short.toUpperCase(), bottom: String(site.place || "").toUpperCase(),
      date: new Date(visit.date), color: inkFor(site), seed: Cancel.hash(visit.id),
    }, px || 320));
    return CANCEL_CACHE.get(key);
  }

  const ICONS = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z"/><circle cx="12" cy="11" r="3.5"/><path d="M9 17h6"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 20l5-2 8 3 5-2V4l-5 2-8-3-5 2z"/><path d="M8 3v15M16 6v15"/></svg>',
    stats: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    album: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v8h14v-8"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  };
  const STAMP_HANDLE = `<svg class="handle" viewBox="0 0 120 150" aria-hidden="true">
    <ellipse cx="60" cy="26" rx="26" ry="22" fill="#8a5a36"/><ellipse cx="54" cy="20" rx="10" ry="6" fill="#a87148"/>
    <rect x="50" y="44" width="20" height="46" rx="6" fill="#7a4e2e"/>
    <rect x="14" y="88" width="92" height="30" rx="6" fill="#8a5a36"/><rect x="10" y="116" width="100" height="14" rx="3" fill="#25282A"/></svg>`;

  function tabbar(active) {
    const t = (href, key, label, icon) => `<a href="${href}" class="${active === key ? "on" : ""}">${ICONS[icon]}<span>${label}</span></a>`;
    return `<nav class="tabbar" aria-label="Main">${t("#/book", "book", "Passport", "book")}${t("#/sites", "sites", "Sites", "map")}${t("#/stats", "stats", "Stats", "stats")}${t("#/journal", "journal", "Journal", "cam")}${t("#/about", "about", "About", "info")}</nav>`;
  }
  function topbar(title, back) {
    const n = Store.collected().size, total = DATA.sites.length;
    return `<header class="topbar">
      ${back ? `<button class="back" onclick="history.length>1?history.back():location.hash='#/book'" aria-label="Back">&larr;</button>` : `<img class="mark" src="assets/brand/trpl-tr-brand-mark-sunset-yellow.svg" alt="">`}
      <div class="title">${esc(title)}</div><div class="spacer"></div>
      <a class="count" href="#/stats"><b>${n}/${total}</b>stamps</a></header>`;
  }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
  }
  function sheet(html, label) {
    const wrap = document.createElement("div");
    wrap.className = "sheet-backdrop";
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label || "")}"><div class="grab"></div><div class="sb">${html}</div></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) wrap.remove(); });
    return { el: wrap, body: wrap.querySelector(".sb"), close: () => wrap.remove() };
  }

  // Two ways in: camera or photo library. iOS shows only the camera when `capture` is set,
  // so each choice gets its own input.
  function photoPicker(id, facing) {
    return `<div class="picker">
      <label class="pick">${ICONS.cam}<span>Take photo</span><input type="file" accept="image/*" capture="${facing || "environment"}" data-pick="${id}"></label>
      <label class="pick">${ICONS.album}<span>Photo library</span><input type="file" accept="image/*" data-pick="${id}"></label></div>`;
  }
  function onPick(root, id, fn) {
    root.querySelectorAll(`[data-pick="${id}"]`).forEach((inp) => inp.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) fn(f); e.target.value = ""; }));
  }

  // ---------- add to Home Screen ----------
  let deferredInstall = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; const b = document.querySelector(".install"); if (b) route(); });
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function installCard(force) {
    let dismissed = false; try { dismissed = localStorage.getItem("trpassport.installDismissed") === "1"; } catch (e) {}
    if (standalone() || (dismissed && !force)) return "";
    const how = deferredInstall
      ? `<button class="btn small" data-install>Add to Home Screen</button>`
      : isIOS()
        ? `<p class="caption">Tap <span class="ios-share">${ICONS.share}</span> <b>Share</b> in Safari, then <b>Add to Home Screen</b>.</p>`
        : `<p class="caption">Open your browser menu and choose <b>Add to Home Screen</b> or <b>Install app</b>.</p>`;
    return `<div class="install"><img src="assets/icons/icon-192.png" alt="" width="52" height="52">
      <div><b>Keep your passport on your Home Screen</b><p class="caption">It opens like an app and works in parks with no signal.</p>${how}</div>
      ${force ? "" : `<button class="x" data-dismiss aria-label="Dismiss">×</button>`}</div>`;
  }
  function bindInstall(root) {
    const b = root.querySelector("[data-install]");
    if (b) b.onclick = async () => { deferredInstall.prompt(); await deferredInstall.userChoice.catch(() => {}); deferredInstall = null; route(); };
    const x = root.querySelector("[data-dismiss]");
    if (x) x.onclick = () => { try { localStorage.setItem("trpassport.installDismissed", "1"); } catch (e) {} x.closest(".install").remove(); };
  }

  // ---------- Views ----------
  function viewCover() {
    $app.innerHTML = `<section class="cover">
      <div class="emboss"><div class="kicker">The T.R.</div><h1 class="display">Passport</h1>
      <div class="sub">To America's Public Lands</div></div>
      <img class="mark" src="assets/brand/trpl-tr-brand-mark-sunset-yellow.svg" alt="Theodore Roosevelt Presidential Library mark">
      <div>
        <a class="btn" href="${Store.holder ? "#/book" : "#/welcome"}">${Store.holder ? "Open passport" : "Get your passport"}</a>
        <img class="issuer" src="assets/brand/trpl-logo-horizontal-white.svg" alt="Theodore Roosevelt Presidential Library">
      </div></section>`;
  }

  function viewWelcome() {
    const h = Store.holder || {};
    let newPhoto = null;
    $app.innerHTML = `<div class="view paper">${topbar("Your passport", true)}
      <div class="prose">
        <div class="eyebrow" style="color:var(--dark-forest)">${Store.holder ? "Passport details" : "Issue your passport"}</div>
        <h1 class="display" style="color:var(--night-sky);font-size:46px;margin:6px 0 12px">Dare greatly. Go see it.</h1>
        <p>Collect a stamp at every national park, monument and historic site. Add a photo from each visit and fill the book.</p>
        <form id="f">
          <div class="field"><label>Passport photo</label>
            <div class="photo-row"><div class="avatar big" id="av"></div>${photoPicker("holder", "user")}</div></div>
          <div class="field"><label for="nm">Passport holder</label><input id="nm" required maxlength="40" autocomplete="name" value="${esc(h.name || "")}" placeholder="Your name"></div>
          <div class="field"><label for="ht">Hometown</label><input id="ht" maxlength="40" value="${esc(h.hometown || "")}" placeholder="City, State"></div>
          <button class="btn block" type="submit">${Store.holder ? "Save" : "Issue my passport"}</button>
        </form>
        <p class="caption" style="margin-top:14px;color:#5b6570">Prototype: your passport is saved only in this browser.</p>
      </div></div>`;
    const av = document.getElementById("av");
    Store.holderPhoto().then((p) => { if (p) av.style.backgroundImage = `url(${URL.createObjectURL(p.blob)})`; });
    onPick($app, "holder", async (f) => { newPhoto = await downscale(f, 900, true); av.style.backgroundImage = `url(${URL.createObjectURL(newPhoto)})`; });
    document.getElementById("f").onsubmit = async (e) => {
      e.preventDefault();
      Store.setHolder({ name: document.getElementById("nm").value.trim(), hometown: document.getElementById("ht").value.trim() });
      if (newPhoto) await Store.setHolderPhoto(newPhoto);
      PASSPORT_CARD = null;
      location.hash = "#/book";
    };
  }

  function idCard() {
    const h = Store.holder;
    const issued = new Date(h.issued);
    const pad = (s) => (s + "<".repeat(30)).slice(0, 30);
    const mrz = esc(pad(`P<USA${(h.name || "").toUpperCase().replace(/[^A-Z]+/g, "<")}`)) + "<br>" + esc(pad(`${h.number}<<TRPL<${issued.getFullYear()}`));
    return `<div class="idcard">
      <a class="avatar" id="idav" href="#/welcome" aria-label="Change passport photo"><img src="assets/brand/trpl-tr-brand-mark-night-sky.svg" alt=""><span>Add photo</span></a>
      <dl><dt>Holder</dt><dd>${esc(h.name)}</dd>
        ${h.hometown ? `<dt>Home</dt><dd>${esc(h.hometown)}</dd>` : ""}
        <dt>No.</dt><dd>${esc(h.number)}</dd><dt>Issued</dt><dd>${issued.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</dd></dl>
      <div class="mrz">${mrz}</div></div>`;
  }
  function fillAvatar() {
    const av = document.getElementById("idav"); if (!av) return;
    Store.holderPhoto().then((p) => { if (p) { av.classList.add("has"); av.style.backgroundImage = `url(${URL.createObjectURL(p.blob)})`; } });
  }

  function slot(site, got) {
    const visits = Store.visits(site.id);
    const last = visits[visits.length - 1];
    return `<a class="slot ${got ? "got" : ""} ${site.stickerKind === "photo" ? "photo" : ""}" href="#/site/${site.id}">
      ${visits.length > 1 ? `<span class="badge">×${visits.length}</span>` : ""}
      <div class="art"><img class="sticker" src="${stickerSrc(site)}" alt="" loading="lazy" decoding="async">
      ${got ? `<img class="cancel" style="transform:rotate(${rotFor(last)}deg)" src="${cancelURL(site, last, 260)}" alt="Stamped ${fmtDate(last.date)}">` : ""}</div>
      <div class="name">${esc(site.short)}</div><div class="where">${esc(site.place)}</div></a>`;
  }

  function chapters() {
    const got = Store.collected();
    const tr = DATA.sites.filter(isTR);
    const ch = [{ id: "tr", name: "T.R. Sites", states: "Places Theodore Roosevelt protected or knew", color: "#1B4532", sites: tr }]
      .concat(DATA.regions.map((r) => Object.assign({}, r, { sites: DATA.sites.filter((s) => s.region === r.id) })));
    return ch.map((c) => {
      const n = c.sites.filter((s) => got.has(s.id)).length;
      const thumbs = c.sites.filter((s) => got.has(s.id)).slice(0, 4);
      const fill = thumbs.length ? thumbs : c.sites.filter((s) => s.stickerKind === "art").slice(0, 4);
      return `<a class="chapter" href="#/region/${c.id}" style="--c:${c.color}">
        <div class="ch-head"><h2 class="display">${esc(c.name)}</h2><span class="caption">${n} of ${c.sites.length}</span></div>
        <div class="ch-body"><div class="ch-thumbs">${fill.map((s) => `<img src="${stickerSrc(s)}" alt="" loading="lazy" class="${got.has(s.id) ? "" : "off"}">`).join("")}</div>
        <div class="ch-meta caption">${esc(c.states)}</div></div>
        <div class="bar"><i style="width:${(n / c.sites.length) * 100}%"></i></div></a>`;
    }).join("");
  }

  function viewBook() {
    if (!Store.holder) { location.hash = "#/welcome"; return; }
    const got = Store.collected(); const total = DATA.sites.length;
    $app.innerHTML = `<div class="view paper">${topbar("T.R. Passport")}<div class="proto-banner">Prototype · stamps are saved on this device only</div>
      <div class="idpage">${idCard()}
        <div class="progress"><div class="row"><span class="eyebrow" style="color:var(--night-sky)">Your progress</span><span class="caption">${got.size} of ${total} sites</span></div>
        <div class="bar"><i style="width:${(got.size / total) * 100}%"></i></div></div>
        ${got.size ? `<button class="btn ghost block small share-btn" id="sharePassport">${ICONS.share} Share my passport</button>` : `<a class="btn block" href="#/sites">Find your first stamp</a>`}
        ${installCard()}
      </div>
      <div class="chapters">${chapters()}</div>
      <div class="foot"><img src="assets/brand/trpl-logo-horizontal-black.svg" alt="Theodore Roosevelt Presidential Library"></div>
      </div>${tabbar("book")}`;
    fillAvatar(); bindInstall($app);
    const sp = document.getElementById("sharePassport");
    if (sp) { const ready = passportCard(); sp.onclick = () => shareBlob(ready, "tr-passport.png", "My T.R. Passport", `${got.size} stamps and counting in my T.R. Passport.`); }
  }

  function viewRegion(id) {
    const got = Store.collected();
    const r = id === "tr" ? { name: "T.R. Sites", color: "#1B4532", states: "Places Theodore Roosevelt protected or knew" } : REGION[id];
    if (!r) { location.hash = "#/book"; return; }
    const sites = DATA.sites.filter((s) => (id === "tr" ? isTR(s) : s.region === id));
    const n = sites.filter((s) => got.has(s.id)).length;
    $app.innerHTML = `<div class="view paper">${topbar(r.name, true)}
      <div class="region-band" style="background:${r.color}"><h2 class="display">${esc(r.name)}</h2><div class="caption">${n} of ${sites.length}<br>${esc(r.states)}</div></div>
      <div class="search"><input id="q" type="search" placeholder="Search this page" aria-label="Search"></div>
      <div class="slots" id="slots">${sites.map((s) => slot(s, got.has(s.id))).join("")}</div></div>${tabbar("book")}`;
    document.getElementById("q").oninput = (e) => {
      const q = e.target.value.toLowerCase();
      document.getElementById("slots").innerHTML = sites.filter((s) => !q || `${s.name} ${s.place}`.toLowerCase().includes(q)).map((s) => slot(s, got.has(s.id))).join("");
    };
  }

  let siteFilter = { q: "", region: "all" };
  let lastPos = null;
  function viewSites() {
    const got = Store.collected();
    const chips = [{ id: "all", name: "All" }, { id: "got", name: "Collected" }, { id: "need", name: "Not yet" }, { id: "tr", name: "T.R. sites" }, { id: "np", name: "National parks" }, ...DATA.regions]
      .map((r) => `<button data-r="${r.id}" class="${siteFilter.region === r.id ? "on" : ""}">${esc(r.name)}</button>`).join("");
    $app.innerHTML = `<div class="view paper">${topbar("Sites")}
      <div class="search"><input id="q" type="search" placeholder="Search ${DATA.sites.length} parks and sites" value="${esc(siteFilter.q)}" aria-label="Search sites">
      <div class="chips">${chips}</div>
      <button class="link-btn" id="near" style="justify-self:start">${ICONS.pin.replace("<svg", '<svg width="14" height="14" style="vertical-align:-2px"')} Sort by distance from me</button></div>
      <ul class="list" id="list"></ul></div>${tabbar("sites")}`;
    const render = () => {
      const q = siteFilter.q.toLowerCase();
      let rows = DATA.sites.filter((s) => {
        if (q && !(`${s.name} ${s.place} ${s.states.join(" ")} ${s.designation}`.toLowerCase().includes(q))) return false;
        switch (siteFilter.region) {
          case "all": return true;
          case "got": return got.has(s.id);
          case "need": return !got.has(s.id);
          case "tr": return isTR(s);
          case "np": return /^National Park( & Preserve)?$/.test(s.designation);
          default: return s.region === siteFilter.region;
        }
      });
      if (lastPos) rows = rows.map((s) => Object.assign({ _d: Geo.distanceKm(lastPos, s) }, s)).sort((a, b) => a._d - b._d);
      document.getElementById("list").innerHTML = rows.map((s) => `<li><a href="#/site/${s.id}">
        <img class="thumb ${got.has(s.id) ? "" : "off"}" src="${stickerSrc(s)}" alt="" loading="lazy" decoding="async">
        <div><div class="nm">${esc(s.short)}</div><div class="meta">${esc(s.designation)} · ${esc(s.place)}${s._d != null ? ` · ${Geo.miles(s._d)}` : ""}</div></div>
        <div class="tick">${got.has(s.id) ? "Stamped" : isTR(s) ? "<span class='trtag'>T.R.</span>" : ""}</div></a></li>`).join("") || `<li class="empty">No sites match.</li>`;
    };
    render();
    document.getElementById("q").oninput = (e) => { siteFilter.q = e.target.value; render(); };
    document.querySelectorAll(".chips button").forEach((b) => b.onclick = () => { siteFilter.region = b.dataset.r; viewSites(); });
    document.getElementById("near").onclick = () => Geo.locate().then((p) => { lastPos = p; render(); toast("Sorted by distance"); }).catch(() => toast("Location isn't available"));
  }

  async function photoGrid(ids) {
    const urls = [];
    for (const id of ids) { const p = await Store.photo(id); if (p) urls.push(URL.createObjectURL(p.blob)); }
    return urls.map((u) => `<img src="${u}" alt="Visit photo">`).join("");
  }

  // Live detail for one site from the Public Lands Directory (falls back quietly offline).
  const DETAIL = new Map();
  function detail(site) {
    if (!DETAIL.has(site.id)) DETAIL.set(site.id, fetch(`${DIRECTORY}/api/sites/${site.slug}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
    return DETAIL.get(site.id);
  }

  async function viewSite(id) {
    const s = SITE[id]; if (!s) { location.hash = "#/sites"; return; }
    const r = REGION[s.region];
    const visits = Store.visits(id); const last = visits[visits.length - 1];
    $app.innerHTML = `<div class="view paper">${topbar(r.name, true)}
      <div class="hero"><div class="big ${s.stickerKind === "photo" ? "photo" : ""}"><img class="sticker" src="${stickerSrc(s)}" alt="Stamp art for ${esc(s.name)}">
        ${last ? `<img class="cancel" style="transform:rotate(${rotFor(last)}deg)" src="${cancelURL(s, last, 360)}" alt="">` : ""}</div>
        <span class="chip eyebrow" style="background:${r.color}">${esc(s.designation)}</span>
        <h1 class="display">${esc(s.name)}</h1><div class="loc">${esc(s.place)} · National Park Service</div></div>
      <div class="cta-wrap"><button class="btn block" id="go">${visits.length ? "Stamp another visit" : "Get your stamp"}</button>
        ${visits.length ? `<button class="btn ghost block small share-btn" id="shareLast">${ICONS.share} Share my stamp</button>` : ""}</div>
      ${s.tr ? `<div class="section"><div class="callout"><div class="eyebrow">The T.R. connection</div><p style="margin:0">${esc(s.tr)}</p></div></div>` : ""}
      ${visits.length ? `<div class="section"><h2 class="display" style="color:var(--night-sky);margin:10px 0">Your visits</h2>
        <div class="visits">${visits.map((v) => `<figure><button class="vshare" data-v="${v.id}" aria-label="Share stamp from ${fmtDate(v.date)}"><img src="${cancelURL(s, v, 240)}" alt="" style="mix-blend-mode:multiply;transform:rotate(${rotFor(v)}deg)"></button>
        <figcaption>${fmtDate(v.date)}<br>${v.verified === "gps" ? "Checked in" : v.verified === "past" ? "Logged later" : "Simulated"} · <button class="link-btn tiny" data-v="${v.id}">Share</button></figcaption></figure>`).join("")}</div></div>
        <div class="section"><div class="photos" id="ph"></div></div>` : ""}
      <div class="section" id="live"><div class="caption" style="color:#5b6570">Loading park details…</div></div>
      <div class="section links2"><a class="btn ghost block small" href="${esc(s.directory)}" target="_blank" rel="noopener">Full guide in the Public Lands Directory</a>
        ${s.url ? `<a class="btn ghost block small" href="${esc(s.url)}" target="_blank" rel="noopener">Plan a visit at NPS.gov</a>` : ""}</div>
      ${s.stickerKind === "photo" && s.photo ? `<p class="section caption credit">Badge photo: ${esc(s.photo.credit || "National Park Service")}${s.photo.license ? ` (${s.photo.licenseUrl ? `<a href="${esc(s.photo.licenseUrl)}">${esc(s.photo.license)}</a>` : esc(s.photo.license)})` : ""}</p>` : ""}
      </div>${tabbar("")}`;
    document.getElementById("go").onclick = () => stampFlow(s);
    if (visits.length) {
      const cards = new Map(visits.map((v) => [v.id, null]));
      const ready = (v) => { if (!cards.get(v.id)) cards.set(v.id, stampCard(s, v)); return cards.get(v.id); };
      ready(last);
      const doShare = (vid) => { const v = visits.find((x) => x.id === vid); shareBlob(ready(v), `tr-passport-${s.id}.png`, `T.R. Passport: ${s.short}`, `I got my ${s.short} stamp in the T.R. Passport.`); };
      document.getElementById("shareLast").onclick = () => doShare(last.id);
      document.querySelectorAll("[data-v]").forEach((b) => { b.onpointerdown = () => ready(visits.find((x) => x.id === b.dataset.v)); b.onclick = () => doShare(b.dataset.v); });
      document.getElementById("ph").innerHTML = await photoGrid(visits.flatMap((v) => v.photoIds));
    }
    const d = await detail(s);
    const live = document.getElementById("live"); if (!live) return;
    if (!d) { live.innerHTML = ""; return; }
    const alerts = (d.alerts || []).slice(0, 3);
    const fee = (d.fees || [])[0];
    const est = d.firstProtected || d.established;
    live.innerHTML = `${alerts.length ? `<div class="alerts">${alerts.map((a) => `<a class="alert" href="${esc(a.url || s.directory)}" target="_blank" rel="noopener"><b>${esc(a.kind || "Alert")}:</b> ${esc(a.title)}</a>`).join("")}</div>` : ""}
      ${d.cover ? `<figure class="cover-photo"><img src="${esc(d.cover.url)}" alt="${esc(d.cover.alt || "")}" loading="lazy"><figcaption class="caption">${esc(d.cover.credit || "")}</figcaption></figure>` : ""}
      ${d.summary ? `<p>${esc(d.summary)}</p>` : ""}
      <dl class="facts">
        ${est && est.date ? `<dt>Protected</dt><dd>${fmtDate(est.date + "T12:00:00")}${est.authority && est.authority.administration ? ` · ${esc(est.authority.administration)}` : ""}</dd>` : ""}
        ${d.acres && d.acres.value ? `<dt>Size</dt><dd>${Math.round(d.acres.value).toLocaleString()} acres</dd>` : ""}
        ${d.visitation && d.visitation.recreation ? `<dt>Visitors</dt><dd>${d.visitation.recreation.toLocaleString()} in ${d.visitation.year}</dd>` : ""}
        ${fee ? `<dt>Entrance</dt><dd>${Number(fee.cost) ? "$" + Number(fee.cost).toFixed(0) + " " + esc(fee.title.replace(/^Entrance - /, "").toLowerCase()) : "Free"}</dd>` : ""}
      </dl>
      ${(d.trails || []).length ? `<h3 class="eyebrow" style="color:var(--dark-forest);margin-top:14px">Trails to try</h3><ul class="trails">${d.trails.slice(0, 3).map((t) => `<li><a href="${esc(t.url)}" target="_blank" rel="noopener">${esc(t.name)}</a> <span class="caption">${t.miles ? t.miles + " mi" : ""}${t.difficulty ? " · " + esc(t.difficulty) : ""}</span></li>`).join("")}</ul>` : ""}
      <p class="caption" style="color:#5b6570">From the Public Lands Directory, synced from the National Park Service.</p>`;
    if (d.boundaryUrl) Geo.prefetchBoundary(s, d.boundaryUrl);
  }

  async function viewJournal() {
    const visits = Store.visits().sort((a, b) => b.date.localeCompare(a.date));
    $app.innerHTML = `<div class="view paper">${topbar("Journal")}<div id="j"></div></div>${tabbar("journal")}`;
    if (!visits.length) {
      document.getElementById("j").innerHTML = `<div class="empty"><img src="assets/brand/trpl-tr-brand-mark-night-sky.svg" alt="">
        <h2 class="display" style="color:var(--night-sky)">No stamps yet</h2><p>Your stamps and photos will collect here.</p><a class="btn" href="#/sites">Find a site</a></div>`;
      return;
    }
    let html = "";
    for (const v of visits) {
      const s = SITE[v.siteId]; if (!s) continue;
      html += `<div class="entry"><a href="#/site/${s.id}"><img class="cancel" src="${cancelURL(s, v, 200)}" alt="" style="transform:rotate(${rotFor(v)}deg)"></a>
        <div><h3>${esc(s.short)}</h3><div class="caption" style="color:#5b6570">${fmtDate(v.date)} · ${esc(s.place)}</div>
        ${v.photoIds.length ? `<div class="photos">${await photoGrid(v.photoIds)}</div>` : ""}
        <button class="link-btn share-inline" data-share="${v.id}">${ICONS.share.replace("<svg", '<svg width="14" height="14"')} Share this stamp</button></div></div>`;
    }
    document.getElementById("j").innerHTML = html;
    const cards = new Map();
    const ready = (v) => { if (!cards.has(v.id)) cards.set(v.id, stampCard(SITE[v.siteId], v)); return cards.get(v.id); };
    document.querySelectorAll("[data-share]").forEach((b) => {
      const v = visits.find((x) => x.id === b.dataset.share);
      b.onpointerdown = () => ready(v);
      b.onclick = () => shareBlob(ready(v), `tr-passport-${v.siteId}.png`, `T.R. Passport: ${SITE[v.siteId].short}`, `I got my ${SITE[v.siteId].short} stamp in the T.R. Passport.`);
    });
  }

  // ---------- Stats ----------
  function viewStats(tab) {
    tab = tab || "overview";
    const st = Stats.compute(DATA, Store.visits());
    const tabs = [["overview", "Overview"], ["map", "Map"], ["achievements", "Achievements"], ["timeline", "Timeline"]];
    $app.innerHTML = `<div class="view paper">${topbar("Stats")}
      <nav class="subtabs">${tabs.map(([k, l]) => `<a href="#/stats/${k}" class="${tab === k ? "on" : ""}">${l}</a>`).join("")}</nav>
      <div id="st">${{ overview: statsOverview, map: statsMap, achievements: statsAch, timeline: statsTimeline }[tab](st)}</div></div>${tabbar("stats")}`;
  }
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  function bar(label, a, b, color) {
    return `<div class="hbar"><div class="row"><span>${esc(label)}</span><span class="caption">${a} of ${b}</span></div><div class="bar"><i style="width:${b ? (a / b) * 100 : 0}%;${color ? `background:${color}` : ""}"></i></div></div>`;
  }
  function statsOverview(st) {
    const tile = (n, l, sub) => `<div class="tile"><b>${n}</b><span>${l}</span>${sub ? `<em>${sub}</em>` : ""}</div>`;
    return `<div class="tiles">
        ${tile(st.sites.length, "Sites stamped", `${pct(st.sites.length, st.total)}% of the system`)}
        ${tile(st.visits.length, "Total stamps", st.favorite ? `Most: ${esc(st.favorite.site.short)} ×${st.favorite.n}` : "")}
        ${tile(st.states50, "States", `of 50${st.states.has("DC") ? " + DC" : ""}`)}
        ${tile(`${st.regions.size}/9`, "Regions", "")}
        ${tile(`${st.np.got}/${st.np.total}`, "National parks", "")}
        ${tile(`${st.tr.got}/${st.tr.total}`, "T.R. sites", "")}
        ${tile(st.photos, "Stamps with photos", "")}
        ${tile(Stats.achievements(st).filter((a) => a.done).length, "Achievements", `of ${Stats.achievements(st).length}`)}
      </div>
      ${st.first ? `<div class="section"><div class="callout firstlast">
        <div><div class="eyebrow">First stamp</div><a href="#/site/${st.first.siteId}">${esc(SITE[st.first.siteId].short)}</a><div class="caption">${fmtDate(st.first.date)}</div></div>
        <div><div class="eyebrow">Latest stamp</div><a href="#/site/${st.last.siteId}">${esc(SITE[st.last.siteId].short)}</a><div class="caption">${fmtDate(st.last.date)}</div></div></div></div>` : ""}
      <div class="section"><h2 class="display h2s">By type</h2>${st.groups.filter((g) => st.groupTotals[g]).map((g) => bar(g, st.groupGot[g] || 0, st.groupTotals[g])).join("")}</div>
      <div class="section"><h2 class="display h2s">By region</h2>${DATA.regions.map((r) => bar(r.name, st.regionGot[r.id] || 0, st.regionTotals[r.id], r.color)).join("")}</div>
      ${st.visits.length ? "" : `<div class="empty">Stamp your first site to start your stats. <a href="#/sites">Find a site</a></div>`}`;
  }
  function statsMap(st) {
    const totals = {}; DATA.sites.forEach((s) => s.states.forEach((x) => (totals[x] = (totals[x] || 0) + 1)));
    const max = Math.max(1, ...Object.values(st.stateCount));
    const cells = Object.entries(Stats.TILES).map(([code, [r, c]]) => {
      const n = st.stateCount[code] || 0;
      const a = n ? 0.35 + 0.65 * (n / max) : 0;
      return `<div class="tile-st ${n ? "on" : ""}" style="grid-row:${r + 1};grid-column:${c + 1};${n ? `background:rgba(27,69,50,${a.toFixed(2)})` : ""}" title="${code}: ${n} of ${totals[code] || 0}"><b>${code}</b><span>${n}/${totals[code] || 0}</span></div>`;
    }).join("");
    const list = Object.entries(st.stateCount).sort((a, b) => b[1] - a[1]);
    return `<div class="section"><p class="caption" style="color:#5b6570">Sites stamped in each state, out of the units the passport covers there. A unit that spans states counts in each.</p>
      <div class="tilemap">${cells}</div></div>
      <div class="section"><h2 class="display h2s">${st.states50} of 50 states</h2>
      ${list.length ? `<ul class="statelist">${list.map(([k, n]) => `<li><b>${k}</b> ${n} ${n === 1 ? "site" : "sites"}</li>`).join("")}</ul>` : `<p class="caption">No states yet.</p>`}</div>`;
  }
  function statsAch(st) {
    const all = Stats.achievements(st);
    const done = all.filter((a) => a.done), todo = all.filter((a) => !a.done).sort((a, b) => b.progress / b.target - a.progress / a.target);
    const card = (a) => `<div class="ach ${a.done ? "done" : ""}">${Stats.medal(a, 56)}<div><b>${esc(a.name)}</b><div class="caption">${esc(a.how)}</div>
      ${a.done ? `<div class="caption earned">Earned</div>` : `<div class="bar small"><i style="width:${(a.progress / a.target) * 100}%"></i></div><div class="caption">${a.progress} of ${a.target}</div>`}</div></div>`;
    return `<div class="section"><h2 class="display h2s">${done.length} of ${all.length} earned</h2>${done.map(card).join("")}${todo.map(card).join("")}</div>`;
  }
  function statsTimeline(st) {
    if (!st.visits.length) return `<div class="empty">Your stamps will show up here by year and month.</div>`;
    const byYear = {};
    st.visits.forEach((v) => { const d = new Date(v.date); const y = d.getFullYear(); (byYear[y] = byYear[y] || []).push(v); });
    const years = Object.keys(byYear).sort().reverse();
    const max = Math.max(...years.map((y) => byYear[y].length));
    return `<div class="section"><h2 class="display h2s">Stamps by year</h2>${years.map((y) => `<div class="hbar"><div class="row"><span>${y}</span><span class="caption">${byYear[y].length} stamps · ${new Set(byYear[y].map((v) => v.siteId)).size} sites</span></div><div class="bar"><i style="width:${(byYear[y].length / max) * 100}%"></i></div></div>`).join("")}</div>
      ${years.map((y) => `<div class="section"><h2 class="display h2s">${y}</h2><ul class="tl">${byYear[y].slice().reverse().map((v) => `<li><span class="caption">${new Date(v.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span><a href="#/site/${v.siteId}">${esc(SITE[v.siteId].short)}</a><span class="caption">${esc(SITE[v.siteId].place)}</span></li>`).join("")}</ul></div>`).join("")}`;
  }

  function viewAbout() {
    const st = Store.settings;
    $app.innerHTML = `<div class="view paper">${topbar("About")}<div class="prose">
      <h2 class="display">How it works</h2>
      <p>Visit a national park, monument or historic site. Open it in your passport and tap <b>Get your stamp</b>. Your phone confirms you're inside the site, you add a photo, and the stamp goes in your book with the date. Been there before? Choose <b>I visited on an earlier date</b> and log it.</p>
      <p>The passport covers every unit of the National Park System, with site details from the Library's <a href="${DIRECTORY}/">Public Lands Directory</a>. More public lands are coming.</p>
      ${installCard(true)}
      <h2 class="display">Settings</h2>
      <div class="toggle"><div><b>Passport details</b><div class="caption" style="color:#5b6570">${esc(Store.holder ? Store.holder.name : "Not issued")}</div></div><a class="link-btn" href="#/welcome">Edit</a></div>
      <div class="toggle"><div><b>Simulate location</b><div class="caption" style="color:#5b6570">Prototype testing: stamp any site from anywhere.</div></div><input type="checkbox" id="sim" ${st.simulate ? "checked" : ""}></div>
      <div class="toggle"><div><b>Download my data</b><div class="caption" style="color:#5b6570">Stamps and profile as JSON.</div></div><button class="link-btn" id="exp">Download</button></div>
      <div class="toggle"><div><b>Reset passport</b><div class="caption" style="color:#5b6570">Erase stamps, photos and profile on this device.</div></div><button class="link-btn" id="rst">Reset</button></div>
      <h2 class="display">Credits</h2>
      <p class="caption">Stamp illustrations were created with AI image generation (Higgsfield) in the Library's brand palette. Other badges use National Park Service photos (public domain) unless credited otherwise. This passport is a project of the Theodore Roosevelt Presidential Library and is not affiliated with the National Park Service's Passport To Your National Parks program.</p>
      </div><div class="foot"><img src="assets/brand/trpl-logo-horizontal-black.svg" alt="Theodore Roosevelt Presidential Library"><a class="caption" href="https://www.trlibrary.com/visit">Plan your visit to the Library in Medora</a></div></div>${tabbar("about")}`;
    bindInstall($app);
    document.getElementById("sim").onchange = (e) => { Store.setSetting("simulate", e.target.checked); toast(e.target.checked ? "Location simulation on" : "Location simulation off"); };
    document.getElementById("exp").onclick = () => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([Store.export()], { type: "application/json" }));
      a.download = "tr-passport.json"; a.click();
    };
    document.getElementById("rst").onclick = async () => { if (confirm("Erase this passport and all its stamps?")) { await Store.reset(); CANCEL_CACHE.clear(); location.hash = "#/"; } };
  }

  // ---------------- Stamp flow ----------------
  function stampFlow(site) {
    const sh = sheet("", "Get your stamp");
    const body = sh.body;
    const ctx = { verified: null, distance: null, photo: null, date: null };
    const close = () => { sh.close(); route(); };
    sh.el.addEventListener("click", (e) => { if (e.target === sh.el) route(); });
    const steps = (n) => `<div class="steps">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div>`;
    const today = new Date(); const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    function stepLocation() {
      body.innerHTML = `${steps(1)}<div class="eyebrow" style="color:var(--dark-forest)">Step 1 · Check in</div>
        <h2 class="display">Are you at ${esc(site.short)}?</h2>
        <div class="status" id="st"><span class="dot"></span><div><b>Confirm your location</b><div class="caption">We check that you're inside ${esc(site.short)}. Your location isn't saved.</div></div></div>
        <button class="btn block" id="loc">${ICONS.pin.replace("<svg", '<svg width="22" height="22"')} I'm here now</button>
        <button class="btn ghost block small" id="past" style="margin-top:10px">${ICONS.cal.replace("<svg", '<svg width="18" height="18"')} I visited on an earlier date</button>
        <div id="pastbox" hidden><div class="field" style="margin-top:14px"><label for="pd">When were you there?</label><input type="date" id="pd" max="${iso(today)}" min="1900-01-01" value="${iso(today)}"></div>
          <button class="btn block" id="pastgo">Next: add a photo</button></div>
        <div style="text-align:center;margin-top:14px"><button class="link-btn" id="simbtn">Prototype: simulate being here</button></div>`;
      if (Store.settings.simulate) { ctx.verified = "simulated"; stepPhoto(); return; }
      body.querySelector("#simbtn").onclick = () => { ctx.verified = "simulated"; stepPhoto(); };
      body.querySelector("#past").onclick = () => { body.querySelector("#pastbox").hidden = false; body.querySelector("#past").hidden = true; body.querySelector("#pd").focus(); };
      body.querySelector("#pastgo").onclick = () => {
        const v = body.querySelector("#pd").value; if (!v) return;
        const d = new Date(v + "T12:00:00"); if (d > today) { toast("Pick a date that has passed"); return; }
        ctx.verified = "past"; ctx.date = d.toISOString(); stepPhoto();
      };
      body.querySelector("#loc").onclick = async () => {
        const st = body.querySelector("#st");
        st.className = "status"; st.innerHTML = `<span class="dot"></span><div><b>Finding you…</b></div>`;
        try {
          const p = await Geo.locate();
          const res = await Geo.check(p, site);
          ctx.distance = res.km;
          if (res.inside) {
            ctx.verified = "gps";
            st.className = "status ok"; st.innerHTML = `<span class="dot"></span><div><b>You're here.</b><div class="caption">Location confirmed at ${esc(site.short)}.</div></div>`;
            body.querySelector("#loc").outerHTML = `<button class="btn block" id="next">Next: add a photo</button>`;
            body.querySelector("#next").onclick = stepPhoto;
          } else {
            st.className = "status far"; st.innerHTML = `<span class="dot"></span><div><b>You're ${Geo.miles(res.km)} away.</b><div class="caption">Stamps unlock inside the site. Visited before? Log it with an earlier date.</div></div>`;
          }
        } catch (e) {
          st.className = "status far"; st.innerHTML = `<span class="dot"></span><div><b>We couldn't get your location.</b><div class="caption">Allow location access for this site in your browser settings, then try again.</div></div>`;
        }
      };
    }

    function stepPhoto() {
      body.innerHTML = `${steps(2)}<div class="eyebrow" style="color:var(--dark-forest)">Step 2 · Your photo</div>
        <h2 class="display">Add a photo from ${ctx.verified === "past" ? "your visit" : "today"}</h2>
        <div class="drop" id="drop"><div>${ICONS.cam.replace("<svg", '<svg width="44" height="44"')}<div class="caption" style="margin-top:6px">Optional</div></div></div>
        ${photoPicker("visit")}
        <div style="display:grid;gap:10px;margin-top:16px"><button class="btn block" id="next">Stamp my passport</button>
        <button class="link-btn" id="skip" style="justify-self:center">Skip the photo</button></div>`;
      onPick(body, "visit", async (f) => {
        ctx.photo = await downscale(f, 1600);
        const drop = body.querySelector("#drop");
        drop.innerHTML = ""; const img = document.createElement("img"); img.src = URL.createObjectURL(ctx.photo); img.alt = "Your photo"; drop.appendChild(img);
      });
      body.querySelector("#next").onclick = stepStamp;
      body.querySelector("#skip").onclick = () => { ctx.photo = null; stepStamp(); };
    }

    async function stepStamp() {
      const before = Stats.achievements(Stats.compute(DATA, Store.visits())).filter((a) => a.done).map((a) => a.id);
      const visit = Store.addVisit(Object.assign({
        siteId: site.id, verified: ctx.verified,
        distanceKm: ctx.distance == null ? null : Math.round(ctx.distance * 100) / 100,
      }, ctx.date ? { date: ctx.date } : {}));
      if (ctx.photo) await Store.addPhoto(ctx.photo, site.id, visit.id);
      PASSPORT_CARD = null;
      const earned = Stats.achievements(Stats.compute(DATA, Store.visits())).filter((a) => a.done && !before.includes(a.id));
      const card = stampCard(site, visit); // render now so Share opens the share sheet straight away
      body.innerHTML = `${steps(3)}<div class="eyebrow" style="color:var(--dark-forest)">Step 3 · Stamped</div>
        <div class="stage" id="stg" style="--r:${rotFor(visit)}deg">${STAMP_HANDLE}<img class="sticker" src="${stickerSrc(site)}" alt="">
          <img class="cancel" src="${cancelURL(site, visit, 360)}" alt="Stamp dated ${fmtDate(visit.date)}"></div>
        <h2 class="display" style="text-align:center">${esc(site.short)}</h2>
        <p class="caption" style="text-align:center;color:#5b6570">${fmtDate(visit.date)} · ${Store.collected().size} of ${DATA.sites.length} sites stamped</p>
        ${earned.map((a) => `<div class="earned-row">${Stats.medal(a, 44)}<div><div class="eyebrow" style="color:var(--dark-forest)">Achievement earned</div><b>${esc(a.name)}</b></div></div>`).join("")}
        <div style="display:grid;gap:10px;margin-top:10px"><button class="btn block share-btn" id="share">${ICONS.share} Share my stamp</button>
        <button class="btn ghost block small" id="done">Back to my passport</button></div>`;
      const stg = body.querySelector("#stg");
      requestAnimationFrame(() => { stg.classList.add("stamping"); setTimeout(() => stg.classList.add("stamped"), 330); });
      if (navigator.vibrate) setTimeout(() => navigator.vibrate(30), 330);
      body.querySelector("#share").onclick = () => shareBlob(card, `tr-passport-${site.id}.png`, `T.R. Passport: ${site.short}`, `I got my ${site.short} stamp in the T.R. Passport.`);
      body.querySelector("#done").onclick = () => { sh.close(); location.hash = "#/book"; route(); };
    }
    stepLocation();
  }

  function downscale(file, max, square) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (square) { const s = Math.min(sw, sh); sx = (sw - s) / 2; sy = (sh - s) / 2; sw = sh = s; }
        const k = Math.min(1, max / Math.max(sw, sh));
        const c = document.createElement("canvas"); c.width = Math.round(sw * k); c.height = Math.round(sh * k);
        c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
        c.toBlob((b) => resolve(b || file), "image/jpeg", 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------------- Share ----------------
  // Opens the phone's share sheet (Messages, Instagram, Mail, Photos…). If the browser
  // can't share files, or the card wasn't ready in time, show it with a Share/Save button.
  async function shareBlob(blobPromise, filename, title, text) {
    let blob;
    try { blob = await blobPromise; } catch (e) { toast("Couldn't make the card"); return; }
    const file = new File([blob], filename, { type: "image/png" });
    const canFiles = navigator.canShare && navigator.canShare({ files: [file] });
    if (canFiles) {
      try { await navigator.share({ files: [file], title, text }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    const url = URL.createObjectURL(blob);
    const sh = sheet(`<h2 class="display" style="margin-bottom:10px">Share your stamp</h2>
      <img src="${url}" alt="${esc(title)}" class="card-preview">
      ${canFiles ? `<button class="btn block share-btn" id="again">${ICONS.share} Share</button>` : ""}
      <a class="btn ${canFiles ? "ghost small" : ""} block" href="${url}" download="${esc(filename)}" style="margin-top:10px">Save image</a>
      <p class="caption" style="text-align:center;color:#5b6570;margin-top:10px">On a phone you can also press and hold the image to save or share it.</p>`, "Share");
    const again = sh.body.querySelector("#again");
    if (again) again.onclick = async () => { try { await navigator.share({ files: [file], title, text }); sh.close(); } catch (e) { /* stay open */ } };
  }

  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  function canvasToBlob(c) { return new Promise((r) => c.toBlob(r, "image/png")); }
  function cardFrame(g, W, H) {
    g.fillStyle = "#F4F1EA"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#092A4D"; g.fillRect(0, 0, W, 170);
    g.fillStyle = "#F9D635"; g.fillRect(0, 170, W, 8);
    g.fillStyle = "#1B4532"; g.fillRect(0, H - 110, W, 110);
    g.fillStyle = "#FFFFFF"; g.font = '700 30px "Frutiger Next", Arial, sans-serif'; g.textBaseline = "alphabetic";
    g.fillText("Theodore Roosevelt Presidential Library  ·  passport.labs.trlibrary.com", 48, H - 46);
  }
  async function cardHeader(g) {
    const mark = await loadImg("assets/brand/trpl-tr-brand-mark-sunset-yellow.svg");
    g.drawImage(mark, 48, 26, 112, 118);
    g.fillStyle = "#F9D635"; g.font = '700 96px "Dharma Gothic E", Impact, sans-serif'; g.textBaseline = "middle";
    g.fillText("T.R. PASSPORT", 190, 92);
  }
  async function stampCard(site, visit) {
    await document.fonts.ready;
    const W = 1080, H = 1350; const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    cardFrame(g, W, H); await cardHeader(g);
    const photo = visit.photoIds[0] ? await Store.photo(visit.photoIds[0]) : null;
    const st = await loadImg(stickerSrc(site));
    const copts = { top: site.short.toUpperCase(), bottom: String(site.place).toUpperCase(), date: new Date(visit.date), color: inkFor(site), seed: Cancel.hash(visit.id), rotate: rotFor(visit) };
    if (photo) {
      const p = await loadImg(URL.createObjectURL(photo.blob));
      const bw = W - 96, bh = 700, k = Math.max(bw / p.width, bh / p.height);
      g.save(); roundRect(g, 48, 218, bw, bh, 22); g.clip();
      g.drawImage(p, 48 + (bw - p.width * k) / 2, 218 + (bh - p.height * k) / 2, p.width * k, p.height * k); g.restore();
      g.save(); g.shadowColor = "rgba(9,42,77,.35)"; g.shadowBlur = 30; g.drawImage(st, 60, 760, 330, 330); g.restore();
      Cancel.draw(g, Object.assign({ cx: 380, cy: 1010, R: 150 }, copts));
    } else {
      g.drawImage(st, W / 2 - 330, 230, 660, 660);
      Cancel.draw(g, Object.assign({ cx: W / 2 + 230, cy: 800, R: 190 }, copts));
    }
    g.textBaseline = "alphabetic"; g.fillStyle = "#092A4D";
    const tx = photo ? 560 : 60;
    g.font = '700 74px "Dharma Gothic E", Impact, sans-serif';
    const lines = wrapText(g, site.short.toUpperCase(), tx, photo ? 1010 : 1040, W - tx - 60, 66);
    g.font = '400 30px "Frutiger Next", Arial, sans-serif'; g.fillStyle = "#25282A";
    g.fillText(`${site.place} · ${fmtDate(visit.date)}`, tx, (photo ? 1010 : 1040) + lines * 66 + 10);
    return canvasToBlob(c);
  }
  let PASSPORT_CARD = null;
  function passportCard() {
    if (PASSPORT_CARD) return PASSPORT_CARD;
    PASSPORT_CARD = (async () => {
      await document.fonts.ready;
      const st = Stats.compute(DATA, Store.visits());
      const W = 1080, H = 1350; const c = document.createElement("canvas"); c.width = W; c.height = H;
      const g = c.getContext("2d");
      cardFrame(g, W, H); await cardHeader(g);
      const h = Store.holder || {};
      const hp = await Store.holderPhoto();
      let x0 = 60;
      if (hp) {
        const p = await loadImg(URL.createObjectURL(hp.blob));
        g.save(); roundRect(g, 60, 214, 150, 180, 14); g.clip(); const k = Math.max(150 / p.width, 180 / p.height);
        g.drawImage(p, 60 + (150 - p.width * k) / 2, 214 + (180 - p.height * k) / 2, p.width * k, p.height * k); g.restore();
        x0 = 240;
      }
      g.textBaseline = "alphabetic"; g.fillStyle = "#092A4D"; g.font = '700 80px "Dharma Gothic E", Impact, sans-serif';
      g.fillText((h.name || "My passport").toUpperCase(), x0, 290);
      g.font = '400 32px "Frutiger Next", Arial, sans-serif'; g.fillStyle = "#25282A";
      g.fillText(`${st.sites.length} sites · ${st.states50} states · ${st.np.got} national parks · ${st.tr.got} T.R. sites`, x0, 350);
      const recent = [...new Map(st.visits.slice().reverse().map((v) => [v.siteId, v])).values()].slice(0, 12);
      const n = recent.length, cols = n <= 1 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4, rows = Math.ceil(n / cols), gap = 30;
      const size = Math.min(380, (W - 120 - gap * (cols - 1)) / cols, (740 - gap * (rows - 1)) / rows);
      const left = (W - (cols * size + (cols - 1) * gap)) / 2, top = 420 + (760 - (rows * size + (rows - 1) * gap)) / 2;
      for (let i = 0; i < recent.length; i++) {
        const v = recent[i], s = SITE[v.siteId];
        const x = left + (i % cols) * (size + gap), y = top + Math.floor(i / cols) * (size + gap);
        try { g.drawImage(await loadImg(stickerSrc(s)), x, y, size, size); } catch (e) {}
        Cancel.draw(g, { cx: x + size * 0.72, cy: y + size * 0.72, R: size * 0.36, top: s.short.toUpperCase(), bottom: String(s.place).toUpperCase(), date: new Date(v.date), color: inkFor(s), seed: Cancel.hash(v.id), rotate: rotFor(v), alpha: 0.85 });
      }
      return canvasToBlob(c);
    })();
    return PASSPORT_CARD;
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function wrapText(g, text, x, y, max, lh) {
    const words = text.split(" "); let line = "", n = 1;
    for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > max && line) { g.fillText(line, x, y); line = w; y += lh; n++; } else line = t; }
    g.fillText(line, x, y);
    return n;
  }

  // ---------------- Router ----------------
  function route() {
    const h = location.hash.replace(/^#\/?/, "");
    const [page, arg] = h.split("/");
    window.scrollTo(0, 0);
    switch (page) {
      case "": return viewCover();
      case "welcome": return viewWelcome();
      case "book": return viewBook();
      case "region": return viewRegion(arg);
      case "sites": return viewSites();
      case "site": return viewSite(arg);
      case "stats": return viewStats(arg);
      case "journal": return viewJournal();
      case "about": return viewAbout();
      default: location.hash = "#/";
    }
  }

  Promise.all([fetch("data/sites.json").then((r) => r.json()), document.fonts.load('700 20px "Dharma Gothic E"').catch(() => {}), document.fonts.load('700 12px "Frutiger Next"').catch(() => {})])
    .then(([d]) => {
      DATA = d; d.sites.forEach((s) => (SITE[s.id] = s)); d.regions.forEach((r) => (REGION[r.id] = r));
      window.addEventListener("hashchange", route); route();
    });
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
