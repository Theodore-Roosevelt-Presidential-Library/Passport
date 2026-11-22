// Stats and achievements, computed from the visit log.
(function (global) {
  const US50 = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
  const ISLANDS = ["HI", "PR", "VI", "GU", "AS", "MP"];
  const HOMES = ["thrb", "sahi", "thri", "thro"];

  const GROUPS = [
    ["National parks", (d) => /^National Park( & Preserve)?$/.test(d)],
    ["Monuments", (d) => /Monument/.test(d)],
    ["Historic sites & parks", (d) => /Historic|Historical/.test(d)],
    ["Battlefields & military parks", (d) => /Battlefield|Military/.test(d)],
    ["Memorials", (d) => /Memorial/.test(d)],
    ["Seashores & lakeshores", (d) => /Seashore|Lakeshore/.test(d)],
    ["Recreation areas", (d) => /Recreation Area/.test(d)],
    ["Rivers & trails", (d) => /River|Trail|Parkway/.test(d)],
    ["Other units", () => true],
  ];
  const groupOf = (d) => GROUPS.find(([, f]) => f(d))[0];
  const isNP = (s) => /^National Park( & Preserve)?$/.test(s.designation);
  const season = (d) => ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "fall", "fall", "fall", "winter"][d.getMonth()];

  function compute(data, visits) {
    const byId = {}; data.sites.forEach((s) => (byId[s.id] = s));
    const vs = visits.filter((v) => byId[v.siteId]).sort((a, b) => a.date.localeCompare(b.date));
    const sites = [...new Set(vs.map((v) => v.siteId))].map((id) => byId[id]);
    const states = new Set(sites.flatMap((s) => s.states));
    const regions = new Set(sites.map((s) => s.region));
    const perSite = {}; vs.forEach((v) => (perSite[v.siteId] = (perSite[v.siteId] || 0) + 1));
    const years = {}; vs.forEach((v) => { const y = new Date(v.date).getFullYear(); (years[y] = years[y] || new Set()).add(v.siteId); });
    const groupTotals = {}, groupGot = {};
    data.sites.forEach((s) => { const g = groupOf(s.designation); groupTotals[g] = (groupTotals[g] || 0) + 1; });
    sites.forEach((s) => { const g = groupOf(s.designation); groupGot[g] = (groupGot[g] || 0) + 1; });
    const regionTotals = {}, regionGot = {};
    data.sites.forEach((s) => (regionTotals[s.region] = (regionTotals[s.region] || 0) + 1));
    sites.forEach((s) => (regionGot[s.region] = (regionGot[s.region] || 0) + 1));
    const stateCount = {}; sites.forEach((s) => s.states.forEach((st) => (stateCount[st] = (stateCount[st] || 0) + 1)));
    const tr = data.sites.filter((s) => s.trTypes && s.trTypes.length);
    const trProtected = data.sites.filter((s) => (s.trTypes || []).includes("protected"));
    const nps = data.sites.filter(isNP);
    const top = Object.entries(perSite).sort((a, b) => b[1] - a[1])[0];
    return {
      visits: vs, sites, states, regions, perSite, years, groupTotals, groupGot, regionTotals, regionGot, stateCount,
      groups: GROUPS.map((g) => g[0]),
      total: data.sites.length,
      tr: { got: sites.filter((s) => s.trTypes && s.trTypes.length).length, total: tr.length },
      trProtected: { got: sites.filter((s) => (s.trTypes || []).includes("protected")).length, total: trProtected.length },
      np: { got: sites.filter(isNP).length, total: nps.length },
      states50: [...states].filter((s) => US50.includes(s)).length,
      photos: vs.filter((v) => v.photoIds && v.photoIds.length).length,
      first: vs[0], last: vs[vs.length - 1],
      favorite: top && top[1] > 1 ? { site: byId[top[0]], n: top[1] } : null,
      seasons: new Set(vs.map((v) => season(new Date(v.date)))),
      bestYear: Object.entries(years).map(([y, s]) => [y, s.size]).sort((a, b) => b[1] - a[1])[0] || null,
    };
  }

  // [id, name, how to earn, icon, target, progress(st)]
  const ACH = [
    ["first", "First Stamp", "Collect your first stamp.", "star", 1, (s) => s.sites.length],
    ["bully", "Bully!", "Stamp 5 different sites.", "star", 5, (s) => s.sites.length],
    ["rough-rider", "Rough Rider", "Stamp 10 different sites.", "hat", 10, (s) => s.sites.length],
    ["trailblazer", "Trailblazer", "Stamp 25 different sites.", "boot", 25, (s) => s.sites.length],
    ["conservationist", "Conservationist", "Stamp 50 different sites.", "tree", 50, (s) => s.sites.length],
    ["centurion", "Centurion", "Stamp 100 different sites.", "medal", 100, (s) => s.sites.length],
    ["every-acre", "Every Last Acre", "Stamp every unit in the passport.", "crown", (s) => s.total, (s) => s.sites.length],
    ["badlands", "Badlands Cowboy", "Stamp Theodore Roosevelt National Park, where T.R. ranched.", "bison", 1, (s) => s.sites.some((x) => x.id === "thro") ? 1 : 0],
    ["homeplace", "Roosevelt Homeplace", "Stamp the four places of T.R.'s life: Birthplace, Sagamore Hill, Inaugural Site and Theodore Roosevelt National Park.", "home", 4, (s) => s.sites.filter((x) => HOMES.includes(x.id)).length],
    ["footsteps", "In His Footsteps", "Stamp 10 sites with a T.R. connection.", "boot", 10, (s) => s.tr.got],
    ["antiquities", "Antiquities Act", "Stamp 5 places T.R. protected as President.", "column", 5, (s) => s.trProtected.got],
    ["conservation-president", "The Conservation President", "Stamp every place in the passport that T.R. protected.", "tree", (s) => s.trProtected.total, (s) => s.trProtected.got],
    ["crown-jewels", "Crown Jewels", "Stamp 10 national parks.", "peak", 10, (s) => s.np.got],
    ["grand-slam", "Grand Slam", "Stamp every national park.", "peak", (s) => s.np.total, (s) => s.np.got],
    ["state-lines", "State Lines", "Stamp sites in 10 states.", "map", 10, (s) => s.states50],
    ["halfway", "Halfway Across", "Stamp sites in 25 states.", "map", 25, (s) => s.states50],
    ["all-fifty", "All Fifty", "Stamp sites in all 50 states.", "flag", 50, (s) => s.states50],
    ["every-region", "Every Corner", "Stamp at least one site in every passport region.", "compass", 9, (s) => s.regions.size],
    ["region-complete", "Region Complete", "Stamp every site in one region.", "check", 1, (s) => Object.keys(s.regionTotals).some((r) => s.regionGot[r] === s.regionTotals[r]) ? 1 : 0],
    ["history-buff", "History Buff", "Stamp 10 historic sites or historical parks.", "column", 10, (s) => s.groupGot["Historic sites & parks"] || 0],
    ["hallowed-ground", "Hallowed Ground", "Stamp 5 battlefields or military parks.", "flag", 5, (s) => s.groupGot["Battlefields & military parks"] || 0],
    ["shoreline", "Shoreline", "Stamp 3 national seashores or lakeshores.", "wave", 3, (s) => s.groupGot["Seashores & lakeshores"] || 0],
    ["last-frontier", "The Last Frontier", "Stamp a site in Alaska.", "peak", 1, (s) => s.states.has("AK") ? 1 : 0],
    ["island-hopper", "Island Hopper", "Stamp a site in Hawai'i or a U.S. territory.", "wave", 1, (s) => ISLANDS.some((i) => s.states.has(i)) ? 1 : 0],
    ["four-seasons", "Four Seasons", "Collect stamps in winter, spring, summer and fall.", "sun", 4, (s) => s.seasons.size],
    ["big-year", "Big Year", "Stamp 12 different sites in one calendar year.", "calendar", 12, (s) => (s.bestYear ? s.bestYear[1] : 0)],
    ["old-friend", "Old Friend", "Stamp the same site on 3 visits.", "heart", 3, (s) => Math.max(0, ...Object.values(s.perSite))],
    ["shutterbug", "Shutterbug", "Add photos to 10 stamps.", "camera", 10, (s) => s.photos],
    ["birthday", "Happy Birthday, T.R.", "Collect a stamp on October 27, T.R.'s birthday.", "cake", 1, (s) => s.visits.some((v) => { const d = new Date(v.date); return d.getMonth() === 9 && d.getDate() === 27; }) ? 1 : 0],
  ];

  function achievements(st) {
    return ACH.map(([id, name, how, icon, target, fn]) => {
      const t = typeof target === "function" ? target(st) : target;
      const p = Math.min(fn(st), t);
      return { id, name, how, icon, target: t, progress: p, done: t > 0 && p >= t };
    });
  }

  // Simple line icons on a 24-unit grid
  const ICON = {
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    hat: '<path d="M3 15c3 2 15 2 18 0M6 14l1.5-6c.3-1.3 1.5-2 4.5-2s4.2.7 4.5 2L18 14"/><path d="M7 11c3 1 7 1 10 0"/>',
    boot: '<path d="M8 3h5v9l6 3v4H6l1-6z"/><path d="M6 19h13"/>',
    tree: '<path d="M12 3l6 8h-3l4 5H5l4-5H6z"/><path d="M12 16v5"/>',
    medal: '<circle cx="12" cy="14" r="6"/><path d="M8 3l4 5 4-5M12 11v6"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    bison: '<path d="M3 16c0-5 3-8 8-8 3 0 4-2 7-2 2 0 3 2 3 4s-1 3-2 3v5M6 16v4M10 16v4M16 16v4"/><path d="M3 16h17"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10M10 20v-6h4v6"/>',
    column: '<path d="M4 7h16L12 3zM5 21h14M6 9v10M10 9v10M14 9v10M18 9v10"/>',
    peak: '<path d="M2 20l7-12 4 6 3-4 6 10z"/><path d="M8 10l1.5 1.5L11 10"/>',
    map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    wave: '<path d="M2 14c3-3 5-3 7 0s4 3 7 0 4-3 6 0M2 19c3-3 5-3 7 0s4 3 7 0 4-3 6 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    heart: '<path d="M12 20s-8-5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6-8 11-8 11z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    cake: '<path d="M4 21h16v-8H4zM4 16c2 1 4 1 6 0s4-1 6 0 3 1 4 0M12 13V9M12 6v.5"/>',
  };
  const medal = (a, size) => `<svg viewBox="0 0 48 48" width="${size || 56}" height="${size || 56}" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="${a.done ? "#092A4D" : "#E3DFD5"}"/><circle cx="24" cy="24" r="18.5" fill="none" stroke="${a.done ? "#F9D635" : "#B9B4A8"}" stroke-width="1.5" stroke-dasharray="${a.done ? "0" : "2 2"}"/>
    <g transform="translate(12 12)" fill="none" stroke="${a.done ? "#F9D635" : "#8C877C"}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON[a.icon] || ICON.star}</g></svg>`;

  // Tile-grid map of the states, [row, col]
  const TILES = {
    AK: [0, 0], ME: [0, 11], WI: [1, 6], VT: [1, 10], NH: [1, 11],
    WA: [2, 1], ID: [2, 2], MT: [2, 3], ND: [2, 4], MN: [2, 5], IL: [2, 6], MI: [2, 7], NY: [2, 9], MA: [2, 10],
    OR: [3, 1], NV: [3, 2], WY: [3, 3], SD: [3, 4], IA: [3, 5], IN: [3, 6], OH: [3, 7], PA: [3, 8], NJ: [3, 9], CT: [3, 10], RI: [3, 11],
    CA: [4, 1], UT: [4, 2], CO: [4, 3], NE: [4, 4], MO: [4, 5], KY: [4, 6], WV: [4, 7], VA: [4, 8], MD: [4, 9], DE: [4, 10],
    AZ: [5, 2], NM: [5, 3], KS: [5, 4], AR: [5, 5], TN: [5, 6], NC: [5, 7], SC: [5, 8], DC: [5, 9],
    GU: [6, 0], MP: [6, 1], OK: [6, 4], LA: [6, 5], MS: [6, 6], AL: [6, 7], GA: [6, 8],
    HI: [7, 0], AS: [7, 1], TX: [7, 4], FL: [7, 9], PR: [7, 10], VI: [7, 11],
  };

  global.Stats = { compute, achievements, medal, TILES, US50 };
})(window);
