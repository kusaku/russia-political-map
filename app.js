import * as maplibregl from "https://unpkg.com/maplibre-gl@6.10.0/dist/maplibre-gl.mjs";
import { buffer } from "https://esm.sh/@turf/buffer@7.4.0";

const OFFSET = -105;
const INITIAL_VIEW = { center: [0, 62], zoom: 2.65, pitch: 38, bearing: -4 };
const mapLongitude = (longitude) => longitude + OFFSET;
const COLORS = {
  "United Russia": "#2f7cff", CPRF: "#ef3b4d", LDPR: "#ffd23f", "A Just Russia": "#ff8b2b", "New People": "#16d6b2", Yabloko: "#62bd57", "Party of Pensioners": "#b84b58", Greens: "#44b66d", "Communists of Russia": "#bf5c69", "Party of Direct Democracy": "#9c78d7",
  Putin: "#2f7cff", Medvedev: "#2f7cff", Yeltsin: "#79b7ff", Zyuganov: "#ef3b4d", Zhirinovsky: "#ffd23f", Grudinin: "#ef3b4d", Davankov: "#a56de2",
  "Russia's Choice": "#5bbaf2", "Our Home – Russia": "#448ceb", Unity: "#2f7cff", "Fatherland – All Russia": "#cf6c8c", SPS: "#7eb7ff", Rodina: "#d93445", "Agrarian Party": "#70a94d"
};
const PALETTE = ["#d85e82", "#7eb7ff", "#f4c84a", "#60c9a7", "#b98ae8", "#f18b59", "#75b36b", "#d896d2"];
const state = { meta: [], byId: new Map(), geometry: null, caps: null, history: null, type: "presidential", year: "2024", party: null, selectedId: null, hoveredId: null, map: null, bounds: null };
const dom = Object.fromEntries(["data-status", "cycle-count", "coverage-count", "election-date-hero", "year-switch", "view-description", "map-legend", "map-tooltip", "state-code", "state-name", "state-capital", "selected-election-label", "selected-election-title", "selected-turnout", "result-label", "result-note", "election-bars", "election-source", "states-table", "table-election", "party-title", "party-count", "winner-count", "mean-share", "party-table", "data-caveat"].map((id) => [id.replace(/-([a-z])/g, (_, char) => char.toUpperCase()), document.getElementById(id)]));

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
};
const date = (value) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
const pct = (value) => `${Number(value).toFixed(1)}%`;
const round = (value) => Math.round(value * 10) / 10;
const flag = (name, className, alt = "") => `<img class="${className} region-code" src="assets/flags/${name}.svg" alt="${alt}"${alt ? "" : ' aria-hidden="true"'} loading="lazy">`;
const mix = (hex, amount = 0.28) => {
  const rgb = hex.match(/[a-f\d]{2}/gi)?.map((part) => parseInt(part, 16)) || [85, 105, 130];
  return `#${rgb.map((value) => Math.round(value + (255 - value) * amount).toString(16).padStart(2, "0")).join("")}`;
};
const party = (name) => ({ label: name, color: COLORS[name] || PALETTE[[...name].reduce((total, char) => total + char.charCodeAt(0), 0) % PALETTE.length] });
const election = () => state.history.types[state.type][state.year];
const yearsForType = () => Object.keys(state.history.types[state.type]).sort((a, b) => Number(b) - Number(a));
const result = (id) => election().states[id];
const partyResult = (regional, name) => regional?.results.find((item) => item.party === name);
const mapParties = () => [...new Set(Object.values(election().states).flatMap((regional) => regional.results.map((item) => item.party)))];

function prepareGeometry() {
  const bounds = new maplibregl.LngLatBounds();
  const offset = (coordinates) => typeof coordinates[0] === "number" ? [mapLongitude(coordinates[0]), coordinates[1]] : coordinates.map(offset);
  const extend = (coordinates) => typeof coordinates[0] === "number" ? bounds.extend(coordinates) : coordinates.forEach(extend);
  for (const feature of state.geometry.features) {
    feature.properties.id = String(feature.properties.ars || feature.properties.id).padStart(2, "0");
    feature.geometry = { ...feature.geometry, coordinates: offset(feature.geometry.coordinates) };
    extend(feature.geometry.coordinates);
  }
  state.bounds = bounds;
  state.caps = { ...state.geometry, features: state.geometry.features.map((feature) => {
    const inset = feature.properties.id === "60" ? null : buffer(feature, -0.45, { units: "kilometers", steps: 2 });
    if (inset) inset.properties = feature.properties;
    return inset || feature;
  }) };
}

function metric(meta) {
  const regional = result(meta.id), item = state.party ? partyResult(regional, state.party) : regional?.results?.[0];
  if (!item) return { color: "#536074", bright: "#7d8999", height: 6500, label: "No comparable result" };
  const info = party(item.party), color = state.party ? shade(info.color, item.value) : info.color;
  return { color, bright: mix(color), height: state.party ? 1600 + item.value * 760 : 6500 + item.value * 650, label: `${info.label} · ${pct(item.value)}` };
}

function shade(hex, value) {
  const source = hex.match(/[a-f\d]{2}/gi).map((part) => parseInt(part, 16));
  const base = [9, 18, 30], amount = Math.min(1, 0.22 + value / 42 * 0.78);
  return `#${source.map((item, index) => Math.round(base[index] + (item - base[index]) * amount).toString(16).padStart(2, "0")).join("")}`;
}

function applyMetrics() {
  state.geometry.features.forEach((feature) => Object.assign(feature.properties, metric(state.byId.get(feature.properties.id))));
  state.map?.getSource("states")?.setData(state.geometry);
  state.map?.getSource("caps")?.setData(state.caps);
}

function expression(selected, hover, normal) {
  return ["case", ["boolean", ["feature-state", "selected"], false], selected, ["boolean", ["feature-state", "hover"], false], hover, normal];
}

function fit(duration = 0) {
  const compact = matchMedia("(max-width: 820px)").matches;
  state.map.fitBounds(state.bounds, { padding: compact ? { top: 28, right: 20, bottom: 132, left: 20 } : { top: 42, right: 76, bottom: 112, left: 76 }, pitch: compact ? 34 : INITIAL_VIEW.pitch, bearing: compact ? -4 : INITIAL_VIEW.bearing, maxZoom: compact ? 5.65 : INITIAL_VIEW.zoom, duration });
}

function setFeature(id, value) { ["states", "caps"].forEach((source) => state.map?.setFeatureState({ source, id }, value)); }
function refreshSelection(previous) { if (!state.map?.getSource("states")) return; if (previous) setFeature(previous, { selected: false }); if (state.selectedId) setFeature(state.selectedId, { selected: true }); }

function initMap() {
  state.map = new maplibregl.Map({ container: "map", style: { version: 8, sources: {}, light: { anchor: "viewport", color: "#fff", intensity: 0.86, position: [1.45, 145, 42] }, layers: [{ id: "background", type: "background", paint: { "background-color": "rgba(3,5,8,0)" } }] }, center: INITIAL_VIEW.center, zoom: INITIAL_VIEW.zoom, minZoom: 0.35, maxZoom: 8, maxPitch: 75, pitch: INITIAL_VIEW.pitch, bearing: INITIAL_VIEW.bearing, renderWorldCopies: false, antialias: true, attributionControl: false });
  state.map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
  state.map.on("load", () => {
    state.map.setRenderWorldCopies(false);
    [ ["states", state.geometry], ["caps", state.caps] ].forEach(([id, data]) => state.map.addSource(id, { type: "geojson", data, promoteId: "id", maxzoom: 5, tolerance: 0, buffer: 256 }));
    const top = ["+", ["get", "height"], expression(4000, 1500, 0)];
    state.map.addLayer({ id: "state-extrusions", type: "fill-extrusion", source: "states", paint: { "fill-extrusion-color": expression("#eaff38", ["get", "bright"], ["get", "color"]), "fill-extrusion-height": top, "fill-extrusion-base": 0, "fill-extrusion-opacity": 0.98, "fill-extrusion-vertical-gradient": true } });
    state.map.addLayer({ id: "state-outline-caps", type: "fill-extrusion", source: "states", paint: { "fill-extrusion-color": "#080b11", "fill-extrusion-height": ["+", top, 220], "fill-extrusion-base": ["-", top, 260], "fill-extrusion-opacity": 1, "fill-extrusion-vertical-gradient": false } });
    state.map.addLayer({ id: "state-surface-caps", type: "fill-extrusion", source: "caps", paint: { "fill-extrusion-color": expression("#eaff38", ["get", "bright"], ["get", "color"]), "fill-extrusion-height": ["+", top, 360], "fill-extrusion-base": ["-", top, 80], "fill-extrusion-opacity": 0.98, "fill-extrusion-vertical-gradient": false } });
    state.map.addLayer({ id: "state-gloss-caps", type: "fill-extrusion", source: "caps", paint: { "fill-extrusion-color": "#ffffff", "fill-extrusion-height": ["+", top, 440], "fill-extrusion-base": ["+", top, 300], "fill-extrusion-opacity": 0.12, "fill-extrusion-vertical-gradient": false } });
    refreshSelection(); bindMap(); fit();
  });
}

function bindMap() {
  const layers = ["state-gloss-caps", "state-surface-caps", "state-outline-caps", "state-extrusions"];
  state.map.on("mousemove", layers, (event) => {
    const feature = event.features?.[0]; if (!feature) return;
    const id = feature.properties.id;
    state.map.getCanvas().style.cursor = "pointer";
    if (state.hoveredId !== id) {
      if (state.hoveredId) setFeature(state.hoveredId, { hover: false });
      state.hoveredId = id; setFeature(id, { hover: true });
      const meta = state.byId.get(id);
      dom.mapTooltip.innerHTML = tooltip(meta);
    }
    const box = document.querySelector(".map-panel").getBoundingClientRect();
    dom.mapTooltip.hidden = false; dom.mapTooltip.style.left = `${Math.min(event.point.x + 15, box.width - 280)}px`; dom.mapTooltip.style.top = `${Math.min(Math.max(12, event.point.y - 16), box.height - dom.mapTooltip.offsetHeight - 12)}px`;
  });
  state.map.on("mouseleave", layers, () => { state.map.getCanvas().style.cursor = ""; dom.mapTooltip.hidden = true; if (state.hoveredId) setFeature(state.hoveredId, { hover: false }); state.hoveredId = null; });
  state.map.on("click", layers, (event) => select(event.features?.[0]?.properties?.id));
  state.map.on("click", (event) => { if (!state.map.queryRenderedFeatures(event.point, { layers }).length) clearSelection(); });
}

function tooltip(meta) {
  const regional = result(meta.id), items = state.party ? [partyResult(regional, state.party)].filter(Boolean) : regional?.results || [];
  const rows = items.map((item) => { const info = party(item.party); return `<span style="--party-color:${info.color}"><i class="party-dot"></i>${info.label}<b>${pct(item.value)}</b></span>`; }).join("");
  return `<span class="tooltip-title">${flag(meta.flag, "tooltip-flag")}<b>${meta.name}</b></span><div class="tooltip-results">${rows || "No comparable result"}</div>${state.party ? "" : "<small>Click anywhere in the subject</small>"}`;
}

function bar(item) {
  const info = party(item.party);
  return `<div class="party-row" style="--party-color:${info.color}"><div class="party-row-top"><span class="party-name"><i class="party-dot"></i>${info.label}</span><span class="party-value">${pct(item.value)}</span></div><div class="bar-track"><div class="bar-fill" style="--value:${Math.min(100, item.value * 2.15)}%"></div></div></div>`;
}

function renderDetails() {
  const current = election();
  if (!state.selectedId) {
    const national = current.national;
    dom.stateName.textContent = "Russia"; dom.stateCapital.textContent = "National result"; dom.stateCode.innerHTML = flag("ru", "state-flag", "Russia flag"); dom.resultLabel.textContent = "NATIONAL RESULT";
    dom.selectedElectionLabel.textContent = `${state.type === "duma" ? "STATE DUMA" : "PRESIDENTIAL"} ELECTION`;
    dom.selectedElectionTitle.textContent = `${state.year} national result`; dom.selectedTurnout.textContent = national?.turnout ? `${pct(national.turnout)} turnout` : "—";
    dom.resultNote.textContent = national ? `${date(current.date)} · ${national.note || "nationwide result"}` : "No nationwide result is bundled for this historical cycle";
    dom.electionBars.innerHTML = national ? national.results.slice(0, 8).map(bar).join("") : '<p class="empty-state">No nationwide result is available for this historical cycle.</p>';
    dom.electionSource.href = national?.source || current.source; dom.electionSource.textContent = "Source data ↗";
    return;
  }
  const meta = state.byId.get(state.selectedId), regional = result(meta.id); dom.resultLabel.textContent = "REGIONAL RESULT";
  dom.stateName.textContent = meta.name; dom.stateCapital.textContent = `${meta.localName} · federal subject`; dom.stateCode.innerHTML = flag(meta.flag, "state-flag");
  dom.selectedElectionLabel.textContent = `${state.type === "duma" ? "STATE DUMA" : "PRESIDENTIAL"} ELECTION`;
  dom.selectedElectionTitle.textContent = `${state.year} regional result`; dom.selectedTurnout.textContent = regional?.turnout ? `${pct(regional.turnout)} turnout` : "—";
  dom.resultNote.textContent = regional ? `${date(current.date)} · ${regional.note || `${current.provisional ? "preliminary snapshot · " : ""}${regional.results.length} listed results`}` : "No comparable result for this historical cycle";
  dom.electionBars.innerHTML = regional ? regional.results.slice(0, 8).map(bar).join("") : '<p class="empty-state">No matching regional record is bundled for this subject and election.</p>';
  dom.electionSource.href = regional?.source || current.source; dom.electionSource.textContent = regional ? "Source data ↗" : "Historical source ↗";
}

function renderYears() {
  const years = yearsForType();
  if (!years.includes(state.year)) state.year = years[0];
  dom.yearSwitch.innerHTML = years.map((year) => `<button class="year-button ${year === state.year ? "is-active" : ""}" type="button" data-year="${year}" aria-pressed="${year === state.year}">${year}</button>`).join("");
  document.querySelectorAll(".election-type").forEach((button) => { const active = button.dataset.type === state.type; button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", active); });
}

function renderLegend() {
  const national = new Map((election().national?.results || []).map(({ party, value }) => [party, value]));
  dom.mapLegend.innerHTML = mapParties().sort((a, b) => (national.get(b) || 0) - (national.get(a) || 0) || party(a).label.localeCompare(party(b).label)).map((name) => {
    const info = party(name);
    return `<button class="legend-item${name === state.party ? " is-active" : ""}" type="button" data-party="${name}" aria-pressed="${name === state.party}" style="--party-color:${info.color}" title="Show ${info.label} results"><i class="legend-swatch"></i>${info.label}</button>`;
  }).join("") || '<span class="legend-item">No regional data in this cycle</span>';
  dom.mapLegend.onclick = (event) => {
    const name = event.target.closest("[data-party]")?.dataset.party;
    if (!name) return;
    state.party = state.party === name ? null : name;
    render();
  };
}

function renderTable() {
  dom.tableElection.textContent = `${state.year} winner`;
  dom.statesTable.innerHTML = [...state.meta].sort((a, b) => a.name.localeCompare(b.name)).map((meta) => {
    const regional = result(meta.id), winner = regional?.results?.[0], info = winner && party(winner.party);
    return `<tr data-state-id="${meta.id}" class="${meta.id === state.selectedId ? "is-selected" : ""}"><td><button class="state-row-button" type="button" data-state-id="${meta.id}">${flag(meta.flag, "table-flag")}<span>${meta.name}</span></button></td><td>${winner ? `<span class="table-party" style="--party-color:${info.color}"><i class="party-dot"></i>${info.label}</span>` : "Not available"}</td><td class="table-rating">${winner ? pct(winner.value) : "—"}</td><td>${regional?.turnout ? pct(regional.turnout) : "—"}</td></tr>`;
  }).join("");
}

function renderLandscape() {
  const parties = new Map();
  Object.entries(election().states).forEach(([id, regional]) => regional.results.forEach((item) => {
    const entry = parties.get(item.party) || { name: item.party, values: [], leads: 0, strongest: { id, value: item.value } }; entry.values.push(item.value);
    if (regional.results[0] === item) entry.leads += 1; if (item.value > entry.strongest.value) entry.strongest = { id, value: item.value }; parties.set(item.party, entry);
  }));
  const rows = [...parties.values()].filter((entry) => entry.leads).sort((a, b) => b.leads - a.leads || b.values.reduce((x, y) => x + y, 0) - a.values.reduce((x, y) => x + y, 0));
  const regional = Object.values(election().states), winners = regional.map((item) => item.results[0]).filter(Boolean);
  dom.partyTitle.textContent = `${state.year} regional result landscape`; dom.partyCount.textContent = parties.size; dom.winnerCount.textContent = rows.length; dom.meanShare.textContent = winners.length ? pct(winners.reduce((total, item) => total + item.value, 0) / winners.length) : "—";
  dom.partyTable.innerHTML = rows.map((entry) => { const info = party(entry.name), strongest = state.byId.get(entry.strongest.id), mean = entry.values.reduce((total, value) => total + value, 0) / entry.values.length; return `<tr><td><span class="party-key" style="--party-color:${info.color}"><i class="party-dot"></i><b>${info.label}</b></span></td><td><strong class="data-number">${entry.leads}</strong></td><td><strong class="data-number">${pct(mean)}</strong></td><td><button class="strongest-state" type="button" data-state-id="${strongest.id}">${flag(strongest.flag, "table-flag")}<span>${strongest.name}<small>${pct(entry.strongest.value)}</small></span></button></td></tr>`; }).join("") || '<tr><td colspan="4">No comparable regional table is bundled for this cycle.</td></tr>';
  const partial = Object.values(election().states).filter((regional) => regional.partial).length;
  dom.dataCaveat.textContent = `${election().provisional ? "Preliminary CEC-derived snapshot: " : ""}${Object.keys(election().states).length} mapped subjects have a comparable regional record for this election.${partial ? ` ${partial} record keeps its published aggregate for unlisted parties.` : ""} Results are not extrapolated to subjects without one.`;
}

function render() {
  if (state.party && !mapParties().includes(state.party)) state.party = null;
  renderYears(); applyMetrics(); refreshSelection(); renderDetails(); renderLegend(); renderTable(); renderLandscape();
  const current = election(); dom.cycleCount.textContent = Object.values(state.history.types).reduce((total, years) => total + Object.keys(years).length, 0); dom.coverageCount.textContent = Object.keys(current.states).length; dom.electionDateHero.textContent = date(current.date); dom.viewDescription.textContent = state.party
    ? `Colour brightness and height show ${party(state.party).label}'s regional share.`
    : `${state.type === "duma" ? "State Duma party-list" : "Presidential first-round"} result · colour shows the regional winner; height shows the winner’s share. Choose a party below to compare its result.`;
}

function select(id) {
  if (!state.byId.has(id)) return; const previous = state.selectedId; state.selectedId = id; renderDetails(); dom.statesTable.querySelector(".is-selected")?.classList.remove("is-selected"); dom.statesTable.querySelector(`[data-state-id="${id}"]`)?.classList.add("is-selected"); refreshSelection(previous);
  if (matchMedia("(max-width: 820px)").matches) document.getElementById("state-details").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearSelection() {
  if (!state.selectedId) return;
  const previous = state.selectedId; state.selectedId = null;
  renderDetails(); renderTable(); refreshSelection(previous);
}

function bindUi() {
  document.addEventListener("click", (event) => {
    const type = event.target.closest("[data-type]"); if (type) { state.type = type.dataset.type; state.year = yearsForType()[0]; render(); return; }
    const year = event.target.closest("[data-year]"); if (year) { state.year = year.dataset.year; render(); return; }
    const subject = event.target.closest("[data-state-id]"); if (subject) select(subject.dataset.stateId);
  });
  document.getElementById("reset-map").addEventListener("click", () => fit(850));
}

async function init() {
  bindUi();
  try {
    const [meta, geometry, history] = await Promise.all([fetchJson("data/states-meta.json"), fetchJson("data/states.geojson"), fetchJson("data/election-history.json")]);
    state.meta = meta; state.byId = new Map(meta.map((item) => [item.id, item])); state.geometry = geometry; state.history = history;
    const years = Object.values(history.types).flatMap((type) => Object.keys(type).map(Number));
    dom.dataStatus.textContent = `Local election archive · ${Math.min(...years)}–${Math.max(...years)}`;
    prepareGeometry(); render(); initMap();
  } catch (error) { console.error(error); dom.dataStatus.textContent = "Election archive could not be loaded"; dom.stateName.textContent = "Data unavailable"; }
}

init();
