// Local-only data layer for the prototype. Everything stays on this device:
// profile + visits in localStorage, photos in IndexedDB.
// Swap this module for an API client when the data-collection home is chosen.
(function (global) {
  const KEY = "trpassport.v1";
  const blank = () => ({ holder: null, visits: [], settings: { simulate: false } });

  function load() {
    try { return Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); }
    catch (e) { return blank(); }
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn("Could not save", e); } }

  // ---- photos (IndexedDB) ----
  let dbp;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open("trpassport", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function tx(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction("photos", mode);
      const out = fn(t.objectStore("photos"));
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = () => reject(t.error);
    });
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const Store = {
    get holder() { return state.holder; },
    setHolder(h) {
      state.holder = Object.assign({
        number: "TR" + Math.floor(100000 + Math.random() * 899999),
        issued: new Date().toISOString(),
      }, state.holder || {}, h);
      save();
    },
    get settings() { return state.settings; },
    setSetting(k, v) { state.settings[k] = v; save(); },
    visits(siteId) { return siteId ? state.visits.filter((v) => v.siteId === siteId) : state.visits.slice(); },
    collected() { return new Set(state.visits.map((v) => v.siteId)); },
    addVisit(v) {
      const visit = Object.assign({ id: uid(), date: new Date().toISOString(), photoIds: [] }, v);
      state.visits.push(visit); save();
      return visit;
    },
    async addPhoto(blob, siteId, visitId) {
      const id = uid();
      await tx("readwrite", (s) => s.put({ id, blob, siteId, visitId, created: new Date().toISOString() }));
      const v = state.visits.find((x) => x.id === visitId);
      if (v) { v.photoIds.push(id); save(); }
      return id;
    },
    async photo(id) {
      const d = await db();
      return new Promise((resolve) => {
        const r = d.transaction("photos").objectStore("photos").get(id);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => resolve(null);
      });
    },
    export() { return JSON.stringify(state, null, 2); },
    async reset() {
      state = blank(); save();
      try { await tx("readwrite", (s) => s.clear()); } catch (e) { /* ignore */ }
    },
  };
  global.Store = Store;
})(window);
