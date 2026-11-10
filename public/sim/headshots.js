/*
 * AVHL simulator photo layer. Display-only: NEVER mutates roster objects,
 * replay archives, ratings, historical results, or official game packets.
 *
 * Photos are optional and lazy-loaded from a small rights-reviewed manifest.
 * Missing/broken pictures keep the existing team-logo/number fallback.
 */
(() => {
  "use strict";

  const images = new Map();
  const imagesById = new Map();
  let request = null;

  function normalizeName(name) {
    return String(name || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function validatedUrl(input, { image = false } = {}) {
    if (typeof input !== "string" || !input.trim()) return null;
    try {
      const origin = window.location?.origin || "https://www.avhl.org";
      const parsed = new URL(input, origin);
      if (parsed.protocol !== "https:") return null;
      if (image && !["commons.wikimedia.org", "upload.wikimedia.org", new URL(origin).hostname].includes(parsed.hostname)) {
        return null;
      }
      return parsed.href;
    } catch {
      return null;
    }
  }

  function verifiedRecord(name, record) {
    const url = validatedUrl(record?.url, { image: true });
    const source = validatedUrl(record?.source);
    const licenseUrl = validatedUrl(record?.licenseUrl);
    const author = String(record?.author || "").trim();
    const license = String(record?.license || "").trim();
    if (!url || !source || !licenseUrl || !author || !license) return null;
    return { name, url, source, licenseUrl, author, license, note: String(record.note || "") };
  }

  function ingest(manifest) {
    images.clear();
    imagesById.clear();
    if (manifest?.version !== 1 || !manifest.players || typeof manifest.players !== "object" || Array.isArray(manifest.players)) return 0;
    for (const [name, record] of Object.entries(manifest.players)) {
      const key = normalizeName(name);
      const verified = verifiedRecord(name, record);
      if (key && verified) images.set(key, verified);
    }
    for (const [id, record] of Object.entries(manifest.playerIds || {})) {
      if (!/^\d{4}$/.test(id)) continue;
      const verified = verifiedRecord(String(record.name || ""), record);
      if (verified) imagesById.set(id, verified);
    }
    return images.size + imagesById.size;
  }

  function lookup(name, avhlId = null) {
    const id = String(avhlId == null ? "" : avhlId).padStart(4, "0");
    if (imagesById.has(id)) return imagesById.get(id);
    return images.get(normalizeName(name)) || null;
  }

  function hydrate(scope = document) {
    if (!scope?.querySelectorAll || images.size + imagesById.size === 0) return;
    const candidates = scope.querySelectorAll("[data-avhl-photo-name]");
    for (const target of candidates) {
      if (target.dataset.avhlPhotoLoaded === "1" || target.dataset.avhlPhotoLoaded === "error") continue;
      const entry = lookup(target.dataset.avhlPhotoName, target.dataset.avhlPhotoId);
      if (!entry) continue;
      target.dataset.avhlPhotoLoaded = "1";
      const img = document.createElement("img");
      img.className = target.classList.contains("event-player") ? "event-headshot" : "boxscore-headshot";
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      img.title = entry.name + " — photo: " + entry.author + " (" + entry.license + ")";
      img.addEventListener("load", () => {
        target.classList.add("has-headshot");
      }, { once: true });
      img.addEventListener("error", () => {
        target.dataset.avhlPhotoLoaded = "error";
        target.classList.remove("has-headshot");
        img.remove();
      }, { once: true });
      target.append(img);
      img.src = entry.url;
    }
  }

  function renderCredits() {
    const details = document.getElementById("sim-photo-credits");
    const list = document.getElementById("sim-photo-credits-list");
    if (!details || !list) return;
    details.hidden = images.size + imagesById.size === 0;
    const render = () => {
      if (!details.open) return;
      list.replaceChildren();
      const credited = new Set();
      for (const entry of [...images.values(), ...imagesById.values()]) {
        if (credited.has(entry.url)) continue;
        credited.add(entry.url);
      const li = document.createElement("li");
      li.append(document.createTextNode(entry.name + " — " + entry.author + ", "));
      const source = document.createElement("a");
      source.href = entry.source;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "source photo";
      const license = document.createElement("a");
      license.href = entry.licenseUrl;
      license.target = "_blank";
      license.rel = "noopener noreferrer";
      license.textContent = entry.license;
      li.append(source, document.createTextNode(" · "), license);
      if (entry.note) li.append(document.createTextNode(" · " + entry.note));
        list.append(li);
      }
    };
    if (!details.dataset.avhlPhotoCreditsBound) {
      details.addEventListener("toggle", render);
      details.dataset.avhlPhotoCreditsBound = "1";
    }
    render();
  }

  async function load() {
    if (request) return request;
    request = (async () => {
      try {
        const response = await fetch("/sim/headshots.json?v=1", { cache: "force-cache" });
        if (!response.ok) throw new Error("Headshot manifest HTTP " + response.status);
        const count = ingest(await response.json());
        renderCredits();
        hydrate(document);
        return count;
      } catch (error) {
        console.info("AVHL headshots unavailable; using team logos and numbers.", error);
        return 0;
      }
    })();
    return request;
  }

  window.AVHL_HEADSHOTS = { load, hydrate, lookup, normalizeName, ingest };
})();
