// T.R. Passport — app shell, router and views
(function () {
  const $app = document.getElementById("app");
  let DATA = null;
  const SITE = {}; const REGION = {};
  const INK = ["#092A4D", "#1B4532", "#25282A"];

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sticker = (s) => `assets/stickers/${s.sticker}.webp`;
  const fmtDate = (iso) => new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const inkFor = (site) => INK[Cancel.hash(site.id) % INK.length];
  const rotFor = (visit) => (Cancel.hash(visit.id) % 26) - 13;
  const cancelURL = (site, visit, px) => Cancel.toDataURL({
    top: site.short.toUpperCase(), bottom: `${site.city}, ${site.state}`.toUpperCase(),
    date: new Date(visit.date), color: inkFor(site), seed: Cancel.hash(visit.id),
  }, px || 320);

  const ICONS = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2z"/><circle cx="12" cy="11" r="3.5"/><path d="M9 17h6"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 20l5-2 8 3 5-2V4l-5 2-8-3-5 2z"/><path d="M8 3v15M16 6v15"/></svg>',
    cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  };
  const STAMP_HANDLE = `<svg class="handle" viewBox="0 0 120 150" aria-hidden="true">
    <ellipse cx="60" cy="26" rx="26" ry="22" fill="#8a5a36"/><ellipse cx="54" cy="20" rx="10" ry="6" fill="#a87148"/>
    <rect x="50" y="44" width="20" height="46" rx="6" fill="#7a4e2e"/>
    <rect x="14" y="88" width="92" height="30" rx="6" fill="#8a5a36"/><rect x="10" y="116" width="100" height="14" rx="3" fill="#25282A"/></svg>`;

  function tabbar(active) {
    const t = (href, key, label, icon) => `<a href="${href}" class="${active === key ? "on" : ""}">${ICONS[icon]}<span>${label}</span></a>`;
    return `<nav class="tabbar" aria-label="Main">${t("#/book", "book", "Passport", "book")}${t("#/sites", "sites", "Sites", "map")}${t("#/journal", "journal", "Journal", "cam")}${t("#/about", "about", "About", "info")}</nav>`;
  }
  function topbar(title, back) {
    const n = Store.collected().size, total = DATA.sites.length;
    return `<header class="topbar">
      ${back ? `<button class="back" onclick="history.length>1?history.back():location.hash='#/book'" aria-label="Back">&larr;</button>` : `<img class="mark" src="assets/brand/trpl-tr-brand-mark-sunset-yellow.svg" alt="">`}
      <div class="title">${esc(title)}</div><div class="spacer"></div>
      <div class="count"><b>${n}/${total}</b>stamps</div></header>`;
  }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
  }

  // ---------------- Views ----------------
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
    $app.innerHTML = `<div class="view paper">${topbar("Your passport", true)}
      <div class="prose">
        <div class="eyebrow" style="color:var(--dark-forest)">Issue your passport</div>
        <h1 class="display" style="color:var(--night-sky);font-size:46px;margin:6px 0 12px">Dare greatly. Go see it.</h1>
        <p>Collect a stamp at each park, monument and historic site tied to Theodore Roosevelt. Add a photo from every visit and fill the book.</p>
        <form id="f">
          <div class="field"><label for="nm">Passport holder</label><input id="nm" required maxlength="40" autocomplete="name" value="${esc(h.name || "")}" placeholder="Your name"></div>
          <div class="field"><label for="ht">Hometown</label><input id="ht" maxlength="40" value="${esc(h.hometown || "")}" placeholder="City, State"></div>
          <button class="btn block" type="submit">${Store.holder ? "Save" : "Issue my passport"}</button>
        </form>
        <p class="caption" style="margin-top:14px;color:#5b6570">Prototype: your passport is saved only in this browser.</p>
      </div></div>`;
    document.getElementById("f").onsubmit = (e) => {
      e.preventDefault();
      Store.setHolder({ name: document.getElementById("nm").value.trim(), hometown: document.getElementById("ht").value.trim() });
      location.hash = "#/book";
    };
  }

  function idCard() {
    const h = Store.holder;
    const issued = new Date(h.issued);
    const pad = (s) => (s + "<".repeat(30)).slice(0, 30);
    const mrz = esc(pad(`P<USA${(h.name || "").toUpperCase().replace(/[^A-Z]+/g, "<")}`)) + "<br>" + esc(pad(`${h.number}<<TRPL<${issued.getFullYear()}`));
    return `<div class="idcard">
      <div class="avatar"><img src="assets/brand/trpl-tr-brand-mark-night-sky.svg" alt=""></div>
      <dl><dt>Holder</dt><dd>${esc(h.name)}</dd>
        ${h.hometown ? `<dt>Home</dt><dd>${esc(h.hometown)}</dd>` : ""}
        <dt>No.</dt><dd>${esc(h.number)}</dd><dt>Issued</dt><dd>${issued.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</dd></dl>
      <div class="mrz">${mrz}</div></div>`;
  }

  function slot(site, got) {
    const visits = Store.visits(site.id);
    const last = visits[visits.length - 1];
    return `<a class="slot ${got ? "got" : ""}" href="#/site/${site.id}">
      ${visits.length > 1 ? `<span class="badge">×${visits.length}</span>` : ""}
      <div class="art"><img class="sticker" src="${sticker(site)}" alt="" loading="lazy">
      ${got ? `<img class="cancel" style="transform:rotate(${rotFor(last)}deg)" src="${cancelURL(site, last, 260)}" alt="Stamped ${fmtDate(last.date)}">` : ""}</div>
      <div class="name">${esc(site.short)}</div><div class="where">${esc(site.city)}, ${esc(site.state)}</div></a>`;
  }

  function viewBook() {
    if (!Store.holder) { location.hash = "#/welcome"; return; }
    const got = Store.collected(); const total = DATA.sites.length;
    const regions = DATA.regions.map((r) => {
      const sites = DATA.sites.filter((s) => s.region === r.id);
      if (!sites.length) return "";
      const n = sites.filter((s) => got.has(s.id)).length;
      return `<section class="region"><div class="region-band" style="background:${r.color}">
        <h2 class="display">${esc(r.name)}</h2><div class="caption">${n} of ${sites.length}<br>${esc(r.states)}</div></div>
        <div class="slots">${sites.map((s) => slot(s, got.has(s.id))).join("")}</div></section>`;
    }).join("");
    $app.innerHTML = `<div class="view paper">${topbar("T.R. Passport")}<div class="proto-banner">Prototype · stamps are saved on this device only</div>
      <div class="idpage">${idCard()}
        <div class="progress"><div class="row"><span class="eyebrow" style="color:var(--night-sky)">Your progress</span><span class="caption">${got.size} of ${total} sites</span></div>
        <div class="bar"><i style="width:${(got.size / total) * 100}%"></i></div></div></div>
      ${regions}
      <div class="foot"><img src="assets/brand/trpl-logo-horizontal-black.svg" alt="Theodore Roosevelt Presidential Library"></div>
      </div>${tabbar("book")}`;
  }

  let siteFilter = { q: "", region: "all" };
  let lastPos = null;
  function viewSites() {
    const got = Store.collected();
    const chips = [{ id: "all", name: "All" }, { id: "got", name: "Collected" }, { id: "need", name: "Not yet" }, ...DATA.regions]
      .map((r) => `<button data-r="${r.id}" class="${siteFilter.region === r.id ? "on" : ""}">${esc(r.name)}</button>`).join("");
    $app.innerHTML = `<div class="view paper">${topbar("Sites")}
      <div class="search"><input id="q" type="search" placeholder="Search parks and sites" value="${esc(siteFilter.q)}" aria-label="Search sites">
      <div class="chips">${chips}</div>
      <button class="link-btn" id="near" style="justify-self:start">Sort by distance from me</button></div>
      <ul class="list" id="list"></ul></div>${tabbar("sites")}`;
    const render = () => {
      const q = siteFilter.q.toLowerCase();
      let rows = DATA.sites.filter((s) => {
        if (q && !(`${s.name} ${s.city} ${s.state} ${s.designation}`.toLowerCase().includes(q))) return false;
        if (siteFilter.region === "got") return got.has(s.id);
        if (siteFilter.region === "need") return !got.has(s.id);
        return siteFilter.region === "all" || s.region === siteFilter.region;
      });
      if (lastPos) rows = rows.map((s) => Object.assign({ _d: distanceKm(lastPos, s) }, s)).sort((a, b) => a._d - b._d);
      document.getElementById("list").innerHTML = rows.map((s) => `<li><a href="#/site/${s.id}">
        <img class="thumb ${got.has(s.id) ? "" : "off"}" src="${sticker(s)}" alt="" loading="lazy">
        <div><div class="nm">${esc(s.short)}</div><div class="meta">${esc(s.designation)} · ${esc(s.city)}, ${esc(s.state)}${s._d != null ? ` · ${miles(s._d)}` : ""}</div></div>
        <div class="tick">${got.has(s.id) ? "Stamped" : ""}</div></a></li>`).join("") || `<li class="empty">No sites match.</li>`;
    };
    render();
    document.getElementById("q").oninput = (e) => { siteFilter.q = e.target.value; render(); };
    document.querySelectorAll(".chips button").forEach((b) => b.onclick = () => { siteFilter.region = b.dataset.r; viewSites(); });
    document.getElementById("near").onclick = () => locate().then((p) => { lastPos = p; render(); toast("Sorted by distance"); }).catch(() => toast("Location isn't available"));
  }

  async function photoGrid(ids) {
    const urls = [];
    for (const id of ids) { const p = await Store.photo(id); if (p) urls.push(URL.createObjectURL(p.blob)); }
    return urls.map((u) => `<img src="${u}" alt="Visit photo">`).join("");
  }

  async function viewSite(id) {
    const s = SITE[id]; if (!s) { location.hash = "#/sites"; return; }
    const r = REGION[s.region];
    const visits = Store.visits(id); const last = visits[visits.length - 1];
    $app.innerHTML = `<div class="view paper">${topbar(r.name, true)}
      <div class="hero"><div class="big"><img class="sticker" src="${sticker(s)}" alt="Illustrated stamp art for ${esc(s.name)}">
        ${last ? `<img class="cancel" style="transform:rotate(${rotFor(last)}deg)" src="${cancelURL(s, last, 360)}" alt="">` : ""}</div>
        <span class="chip eyebrow" style="background:${r.color}">${esc(s.designation)}</span>
        <h1 class="display">${esc(s.name)}</h1><div class="loc">${esc(s.city)}, ${esc(s.state)} · ${esc(s.agency === "NPS" ? "National Park Service" : s.agency)}</div></div>
      <div class="cta-wrap"><button class="btn block" id="go">${visits.length ? "Stamp another visit" : "Get your stamp"}</button></div>
      <div class="section"><div class="callout"><div class="eyebrow">The T.R. connection</div><p style="margin:0">${esc(s.tr)}</p></div></div>
      ${visits.length ? `<div class="section"><h2 class="display" style="color:var(--night-sky);margin:10px 0">Your visits</h2>
        <div class="visits">${visits.map((v) => `<figure><img src="${cancelURL(s, v, 240)}" alt="" style="mix-blend-mode:multiply;transform:rotate(${rotFor(v)}deg)">
        <figcaption>${fmtDate(v.date)}${v.verified === "gps" ? " · GPS" : " · simulated"}</figcaption></figure>`).join("")}</div></div>
        <div class="section"><div class="photos" id="ph"></div></div>` : ""}
      <div class="section"><a class="btn ghost block small" href="${s.url}" target="_blank" rel="noopener">Plan a visit at NPS.gov</a></div>
      </div>${tabbar("")}`;
    document.getElementById("go").onclick = () => stampFlow(s);
    if (visits.length) document.getElementById("ph").innerHTML = await photoGrid(visits.flatMap((v) => v.photoIds));
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
        <div><h3>${esc(s.short)}</h3><div class="caption" style="color:#5b6570">${fmtDate(v.date)} · ${esc(s.city)}, ${esc(s.state)}</div>
        ${v.photoIds.length ? `<div class="photos">${await photoGrid(v.photoIds)}</div>` : ""}
        <button class="link-btn" data-share="${v.id}" style="margin-top:8px">Share this stamp</button></div></div>`;
    }
    document.getElementById("j").innerHTML = html;
    document.querySelectorAll("[data-share]").forEach((b) => b.onclick = () => {
      const v = visits.find((x) => x.id === b.dataset.share); shareCard(SITE[v.siteId], v);
    });
  }

  function viewAbout() {
    const st = Store.settings;
    $app.innerHTML = `<div class="view paper">${topbar("About")}<div class="prose">
      <h2 class="display">How it works</h2>
      <p>Visit a park, monument or historic site tied to Theodore Roosevelt. Open the site in your passport and tap <b>Get your stamp</b>. Your phone confirms you're there, you add a photo, and the stamp goes in your book with the date.</p>
      <p>We're starting with National Park Service sites connected to T.R. More public lands are coming.</p>
      <h2 class="display">Prototype settings</h2>
      <div class="toggle"><div><b>Simulate location</b><div class="caption" style="color:#5b6570">Stamp any site from anywhere, for testing.</div></div><input type="checkbox" id="sim" ${st.simulate ? "checked" : ""}></div>
      <div class="toggle"><div><b>Passport holder</b><div class="caption" style="color:#5b6570">${esc(Store.holder ? Store.holder.name : "Not issued")}</div></div><a class="link-btn" href="#/welcome">Edit</a></div>
      <div class="toggle"><div><b>Download my data</b><div class="caption" style="color:#5b6570">Stamps and profile as JSON.</div></div><button class="link-btn" id="exp">Download</button></div>
      <div class="toggle"><div><b>Reset passport</b><div class="caption" style="color:#5b6570">Erase stamps, photos and profile on this device.</div></div><button class="link-btn" id="rst">Reset</button></div>
      <h2 class="display">Credits</h2>
      <p class="caption">Stamp illustrations were created with AI image generation (Higgsfield) in the Library's brand palette. This passport is a project of the Theodore Roosevelt Presidential Library and is not affiliated with the National Park Service's Passport To Your National Parks program.</p>
      </div><div class="foot"><img src="assets/brand/trpl-logo-horizontal-black.svg" alt="Theodore Roosevelt Presidential Library"><a class="caption" href="https://www.trlibrary.com/visit">Plan your visit to the Library in Medora</a></div></div>${tabbar("about")}`;
    document.getElementById("sim").onchange = (e) => { Store.setSetting("simulate", e.target.checked); toast(e.target.checked ? "Location simulation on" : "Location simulation off"); };
    document.getElementById("exp").onclick = () => {
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([Store.export()], { type: "application/json" }));
      a.download = "tr-passport.json"; a.click();
    };
    document.getElementById("rst").onclick = async () => { if (confirm("Erase this passport and all its stamps?")) { await Store.reset(); location.hash = "#/"; } };
  }

  // ---------------- Location ----------------
  function distanceKm(pos, site) {
    const R = 6371, rad = (d) => (d * Math.PI) / 180;
    return Math.min(...site.points.map(([la, lo]) => {
      const dLa = rad(la - pos.lat), dLo = rad(lo - pos.lng);
      const a = Math.sin(dLa / 2) ** 2 + Math.cos(rad(pos.lat)) * Math.cos(rad(la)) * Math.sin(dLo / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    }));
  }
  const miles = (km) => { const m = km * 0.621371; return m < 10 ? `${m.toFixed(1)} mi` : `${Math.round(m).toLocaleString()} mi`; };
  function locate() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("unsupported"));
      navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }), reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
  }

  // ---------------- Stamp flow ----------------
  function stampFlow(site) {
    const wrap = document.createElement("div");
    wrap.className = "sheet-backdrop";
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Get your stamp"><div class="grab"></div><div id="sb"></div></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => { if (e.target === wrap) close(); });
    const body = wrap.querySelector("#sb");
    const ctx = { verified: null, pos: null, distance: null, photo: null };
    function close() { wrap.remove(); route(); }
    const steps = (n) => `<div class="steps">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</div>`;

    function stepLocation() {
      body.innerHTML = `${steps(1)}<div class="eyebrow" style="color:var(--dark-forest)">Step 1 · Check in</div>
        <h2 class="display">Are you at ${esc(site.short)}?</h2>
        <div class="status" id="st"><span class="dot"></span><div><b>Confirm your location</b><div class="caption">We check that you're inside ${esc(site.short)}. Your location isn't stored beyond this stamp.</div></div></div>
        <button class="btn block" id="loc">Use my location</button>
        <div style="text-align:center;margin-top:14px"><button class="link-btn" id="simbtn">Prototype: simulate being here</button></div>`;
      if (Store.settings.simulate) { simulate(); return; }
      body.querySelector("#simbtn").onclick = simulate;
      body.querySelector("#loc").onclick = async () => {
        const st = body.querySelector("#st");
        st.innerHTML = `<span class="dot"></span><div><b>Finding you…</b></div>`;
        try {
          const p = await locate(); const d = distanceKm(p, site);
          ctx.pos = p; ctx.distance = d;
          if (d <= site.radiusKm) {
            ctx.verified = "gps";
            st.className = "status ok"; st.innerHTML = `<span class="dot"></span><div><b>You're here.</b><div class="caption">Location confirmed at ${esc(site.short)}.</div></div>`;
            body.querySelector("#loc").outerHTML = `<button class="btn block" id="next">Next: add a photo</button>`;
            body.querySelector("#next").onclick = stepPhoto;
          } else {
            st.className = "status far"; st.innerHTML = `<span class="dot"></span><div><b>You're ${miles(d)} away.</b><div class="caption">Stamps unlock inside the site. Try again when you arrive.</div></div>`;
          }
        } catch (e) {
          st.className = "status far"; st.innerHTML = `<span class="dot"></span><div><b>We couldn't get your location.</b><div class="caption">Allow location access for this site in your browser settings, then try again.</div></div>`;
        }
      };
    }
    function simulate() { ctx.verified = "simulated"; stepPhoto(); }

    function stepPhoto() {
      body.innerHTML = `${steps(2)}<div class="eyebrow" style="color:var(--dark-forest)">Step 2 · Your photo</div>
        <h2 class="display">Add a photo from today</h2>
        <label class="drop" id="drop"><input type="file" accept="image/*" capture="environment" id="file">
          <div>${ICONS.cam.replace("<svg", '<svg width="44" height="44"')}<div class="caption" style="margin-top:6px">Take a photo or choose one</div></div></label>
        <div style="display:grid;gap:10px;margin-top:16px"><button class="btn block" id="next">Stamp my passport</button>
        <button class="link-btn" id="skip" style="justify-self:center">Skip the photo</button></div>`;
      body.querySelector("#file").onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        ctx.photo = await downscale(f, 1600);
        const drop = body.querySelector("#drop");
        drop.querySelector("div").remove();
        const img = document.createElement("img"); img.src = URL.createObjectURL(ctx.photo); img.alt = "Your photo"; drop.prepend(img);
      };
      body.querySelector("#next").onclick = stepStamp;
      body.querySelector("#skip").onclick = () => { ctx.photo = null; stepStamp(); };
    }

    async function stepStamp() {
      const visit = Store.addVisit({
        siteId: site.id, verified: ctx.verified,
        distanceKm: ctx.distance == null ? null : Math.round(ctx.distance * 100) / 100,
      });
      if (ctx.photo) await Store.addPhoto(ctx.photo, site.id, visit.id);
      body.innerHTML = `${steps(3)}<div class="eyebrow" style="color:var(--dark-forest)">Step 3 · Stamped</div>
        <div class="stage" id="stg" style="--r:${rotFor(visit)}deg">${STAMP_HANDLE}<img class="sticker" src="${sticker(site)}" alt="">
          <img class="cancel" src="${cancelURL(site, visit, 360)}" alt="Stamp dated ${fmtDate(visit.date)}"></div>
        <h2 class="display" style="text-align:center">${esc(site.short)}</h2>
        <p class="caption" style="text-align:center;color:#5b6570">${fmtDate(visit.date)} · ${Store.collected().size} of ${DATA.sites.length} stamps collected</p>
        <div style="display:grid;gap:10px;margin-top:10px"><button class="btn block" id="share">Share my stamp</button>
        <button class="btn ghost block small" id="done">Back to my passport</button></div>`;
      const stg = body.querySelector("#stg");
      requestAnimationFrame(() => { stg.classList.add("stamping"); setTimeout(() => stg.classList.add("stamped"), 330); });
      if (navigator.vibrate) setTimeout(() => navigator.vibrate(30), 330);
      body.querySelector("#share").onclick = () => shareCard(site, visit);
      body.querySelector("#done").onclick = () => { wrap.remove(); location.hash = "#/book"; route(); };
    }
    stepLocation();
  }

  function downscale(file, max) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => resolve(b || file), "image/jpeg", 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  // ---------------- Share card (1080×1350) ----------------
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  async function shareCard(site, visit) {
    await document.fonts.ready;
    const W = 1080, H = 1350; const c = document.createElement("canvas"); c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#F4F1EA"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#092A4D"; g.fillRect(0, 0, W, 170);
    g.fillStyle = "#F9D635"; g.fillRect(0, 170, W, 8);
    const mark = await loadImg("assets/brand/trpl-tr-brand-mark-sunset-yellow.svg");
    g.drawImage(mark, 48, 26, 112, 118);
    g.fillStyle = "#F9D635"; g.font = '700 96px "Dharma Gothic E", Impact, sans-serif'; g.textBaseline = "middle";
    g.fillText("T.R. PASSPORT", 190, 92);

    const photo = visit.photoIds[0] ? await Store.photo(visit.photoIds[0]) : null;
    const st = await loadImg(sticker(site));
    if (photo) {
      const p = await loadImg(URL.createObjectURL(photo.blob));
      const bw = W - 96, bh = 700, k = Math.max(bw / p.width, bh / p.height);
      g.save(); roundRect(g, 48, 218, bw, bh, 22); g.clip();
      g.drawImage(p, 48 + (bw - p.width * k) / 2, 218 + (bh - p.height * k) / 2, p.width * k, p.height * k); g.restore();
      g.save(); g.shadowColor = "rgba(9,42,77,.35)"; g.shadowBlur = 30; g.drawImage(st, 60, 760, 330, 330); g.restore();
      Cancel.draw(g, { cx: 380, cy: 1010, R: 150, top: site.short.toUpperCase(), bottom: `${site.city}, ${site.state}`.toUpperCase(), date: new Date(visit.date), color: inkFor(site), seed: Cancel.hash(visit.id), rotate: rotFor(visit) });
    } else {
      g.drawImage(st, W / 2 - 330, 230, 660, 660);
      Cancel.draw(g, { cx: W / 2 + 230, cy: 800, R: 190, top: site.short.toUpperCase(), bottom: `${site.city}, ${site.state}`.toUpperCase(), date: new Date(visit.date), color: inkFor(site), seed: Cancel.hash(visit.id), rotate: rotFor(visit) });
    }
    g.textBaseline = "alphabetic"; g.fillStyle = "#092A4D";
    const tx = photo ? 560 : 60;
    g.font = '700 74px "Dharma Gothic E", Impact, sans-serif';
    wrapText(g, site.short.toUpperCase(), tx, photo ? 1010 : 1040, W - tx - 60, 66);
    g.font = '400 30px "Frutiger Next", Arial, sans-serif'; g.fillStyle = "#25282A";
    g.fillText(`${site.city}, ${site.state} · ${fmtDate(visit.date)}`, tx, photo ? 1150 : 1120);
    g.fillStyle = "#1B4532"; g.fillRect(0, H - 110, W, 110);
    g.fillStyle = "#FFFFFF"; g.font = '700 30px "Frutiger Next", Arial, sans-serif';
    g.fillText("Theodore Roosevelt Presidential Library  ·  passport.labs.trlibrary.com", 48, H - 46);

    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const file = new File([blob], `tr-passport-${site.id}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: `T.R. Passport: ${site.short}`, text: `I got my ${site.short} stamp in the T.R. Passport.` }); return; } catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    toast("Stamp card downloaded");
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function wrapText(g, text, x, y, max, lh) {
    const words = text.split(" "); let line = "";
    for (const w of words) { const t = line ? line + " " + w : w; if (g.measureText(t).width > max && line) { g.fillText(line, x, y); line = w; y += lh; } else line = t; }
    g.fillText(line, x, y);
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
      case "sites": return viewSites();
      case "site": return viewSite(arg);
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
