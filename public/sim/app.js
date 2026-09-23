(async () => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SIMULATOR_VERSION = "V6.7.3";
  const RECENT_GAMES_KEY = "avhlSimulatorRecentGames";
  const RECENT_GAME_LIMIT = 8;

  const elements = {
    homePanel: document.getElementById("home-panel"),
    awayPanel: document.getElementById("away-panel"),
    leagueLogo: document.getElementById("league-logo"),
    leagueLogoFallback: document.getElementById("league-logo-fallback"),
    assetStatus: document.getElementById("asset-status"),
    arenaBackdrop: document.getElementById("arena-backdrop"),
    arenaName: document.getElementById("arena-name"),
    matchupLabel: document.getElementById("matchup-label"),
    homeTeamSelect: document.getElementById("home-team-select"),
    awayTeamSelect: document.getElementById("away-team-select"),
    homeCity: document.getElementById("home-city"),
    awayCity: document.getElementById("away-city"),
    homeAbbr: document.getElementById("home-abbr"),
    awayAbbr: document.getElementById("away-abbr"),
    homeLogo: document.getElementById("home-logo"),
    awayLogo: document.getElementById("away-logo"),
    homeRecord: document.getElementById("home-record"),
    awayRecord: document.getElementById("away-record"),
    homeLogoFallback: document.getElementById("home-logo-fallback"),
    awayLogoFallback: document.getElementById("away-logo-fallback"),
    homeJersey: document.getElementById("home-jersey"),
    awayJersey: document.getElementById("away-jersey"),
    homeJerseyFallback: document.getElementById("home-jersey-fallback"),
    awayJerseyFallback: document.getElementById("away-jersey-fallback"),
    homeJerseySelect: document.getElementById("home-jersey-select"),
    awayJerseySelect: document.getElementById("away-jersey-select"),
    replayCenterLogo: document.getElementById("replay-center-logo"),
    eventCenterLogo: document.getElementById("event-center-logo"),
    homeName: document.getElementById("home-name"),
    awayName: document.getElementById("away-name"),
    homeScore: document.getElementById("home-score"),
    awayScore: document.getElementById("away-score"),
    homeShots: document.getElementById("home-shots"),
    awayShots: document.getElementById("away-shots"),
    period: document.getElementById("period"),
    clock: document.getElementById("clock"),
    strength: document.getElementById("strength"),
    playButton: document.getElementById("play-button"),
    speedSelect: document.getElementById("speed-select"),
    nextGoalButton: document.getElementById("next-goal-button"),
    periodButton: document.getElementById("period-button"),
    endButton: document.getElementById("end-button"),
    newGameButton: document.getElementById("new-game-button"),
    seedInput: document.getElementById("seed-input"),
    recentGamesSelect: document.getElementById("recent-games-select"),
    feed: document.getElementById("feed"),
    eventCount: document.getElementById("event-count"),
    statusPill: document.getElementById("status-pill"),
    statsHomeName: document.getElementById("stats-home-name"),
    statsAwayName: document.getElementById("stats-away-name"),
    statsHomeShots: document.getElementById("stats-home-shots"),
    statsAwayShots: document.getElementById("stats-away-shots"),
    statsHomeAttempts: document.getElementById("stats-home-attempts"),
    statsAwayAttempts: document.getElementById("stats-away-attempts"),
    statsHomeHits: document.getElementById("stats-home-hits"),
    statsAwayHits: document.getElementById("stats-away-hits"),
    statsHomeFaceoffs: document.getElementById("stats-home-faceoffs"),
    statsAwayFaceoffs: document.getElementById("stats-away-faceoffs"),
    statsHomePim: document.getElementById("stats-home-pim"),
    statsAwayPim: document.getElementById("stats-away-pim"),
    summary: document.getElementById("summary"),
    goalSelect: document.getElementById("goal-select"),
    goalAssistLine: document.getElementById("goal-assist-line"),
    replayButton: document.getElementById("replay-button"),
    replayPlayers: document.getElementById("replay-players"),
    replayTrails: document.getElementById("replay-trails"),
    replayPuck: document.getElementById("replay-puck"),
    replayCaption: document.getElementById("replay-caption"),
    replayProgress: document.getElementById("replay-progress"),
    replayTime: document.getElementById("replay-time"),
    replayState: document.getElementById("replay-state"),
    replayRink: document.getElementById("replay-rink"),
    eventRink: document.getElementById("event-rink"),
    periodFilter: document.getElementById("period-filter"),
    eventMarkers: document.getElementById("event-markers"),
    mapTooltip: document.getElementById("map-tooltip"),
    boxScoreContent: document.getElementById("box-score-content"),
    boxScoreTabs: [...document.querySelectorAll("[data-box-tab]")],
    officialExportButton: document.getElementById("official-export-button"),
    officialStatus: document.getElementById("official-status"),
    officialModal: document.getElementById("official-modal"),
    officialForm: document.getElementById("official-form"),
    officialPassword: document.getElementById("official-password"),
    officialPasswordStep: document.getElementById("official-password-step"),
    officialGameStep: document.getElementById("official-game-step"),
    officialGameNumber: document.getElementById("official-game-number"),
    officialMatchup: document.getElementById("official-matchup"),
    officialCheckGame: document.getElementById("official-check-game"),
    officialSaveGame: document.getElementById("official-save-game"),
    officialError: document.getElementById("official-error"),
    officialCloseButtons: [...document.querySelectorAll("[data-official-close]")]
  };

  let game = null;
  let events = [];
  let teams = null;
  let homeId = null;
  let awayId = null;
  let currentEventIndex = -1;
  let timer = null;
  let playing = false;
  let encounteredGoals = [];
  let replayAnimationFrame = null;
  let currentReplayEventId = null;
  let currentReplayEvent = null;
  let replayPlayerNodes = new Map();
  let replayElapsed = 0;
  let replayPlaying = false;
  let replayStartedAt = 0;
  let mapRenderQueued = false;
  let recentGames = [];
  let currentGameHistorySaved = false;
  let activeBoxTab = "team";
  let boxScoreSortByTab = Object.create(null);
  let officialVerifiedGameId = null;
  let officialPasswordValue = "";
  let officialCheckedGameNumber = null;
  let currentGameInput = null;
  let isHistoricalReplay = false;
  let historicalReplayGameId = null;
  let historicalReplayMetadata = null;
  let officialScoringByPlayer = Object.create(null);

  function normalizePlayerId(value) {
    const digits = String(value ?? "").replace(/\D/g, "");
    return digits ? digits.padStart(4, "0").slice(-4) : "";
  }

  async function refreshOfficialScoringStats({ beforeGameId = null, quiet = true } = {}) {
    try {
      const query = Number.isInteger(Number(beforeGameId)) && Number(beforeGameId) > 0
        ? `?beforeGameId=${encodeURIComponent(String(Number(beforeGameId)))}`
        : "";
      const response = await fetch(`/api/sim-season-scoring${query}`, { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Official scoring totals are unavailable.");
      officialScoringByPlayer = payload.players && typeof payload.players === "object"
        ? payload.players
        : Object.create(null);
      return true;
    } catch (error) {
      console.warn("Official AVHL scoring totals unavailable; replay credits will use current-game totals only.", error);
      officialScoringByPlayer = Object.create(null);
      if (!quiet && elements.assetStatus) elements.assetStatus.textContent = "Live scoring totals temporarily unavailable";
      return false;
    }
  }

  function generateSeed() {
    try {
      if (window.crypto?.getRandomValues) {
        const values = new Uint32Array(1);
        window.crypto.getRandomValues(values);
        return values[0] || 1;
      }
    } catch (_) {
      // Fall through to a time-based seed if secure randomness is unavailable.
    }
    return (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0 || 1;
  }

  function cloneData(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function encodeReplaySnapshot(snapshot) {
    const source = new TextEncoder().encode(JSON.stringify(snapshot));
    if (typeof CompressionStream === "function") {
      const stream = new Blob([source]).stream().pipeThrough(new CompressionStream("gzip"));
      const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
      return { encoding: "gzip-base64", data: bytesToBase64(compressed), jsonBytes: source.byteLength, compressedBytes: compressed.byteLength };
    }
    return { encoding: "json-base64", data: bytesToBase64(source), jsonBytes: source.byteLength, compressedBytes: source.byteLength };
  }

  async function decodeReplayArchive(archive) {
    if (!archive?.data) throw new Error("The saved replay archive is empty.");
    const bytes = base64ToBytes(archive.data);
    if (archive.encoding === "json-base64") return JSON.parse(new TextDecoder().decode(bytes));
    if (archive.encoding !== "gzip-base64") throw new Error("This saved replay uses an unsupported archive format.");
    if (typeof DecompressionStream !== "function") throw new Error("This browser cannot open compressed AVHL replays.");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return JSON.parse(await new Response(stream).text());
  }

  function loadRecentGames() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECENT_GAMES_KEY) || "[]");
      recentGames = Array.isArray(parsed) ? parsed.slice(0, RECENT_GAME_LIMIT) : [];
    } catch (_) {
      recentGames = [];
    }
  }

  function persistRecentGames() {
    try {
      window.localStorage.setItem(RECENT_GAMES_KEY, JSON.stringify(recentGames.slice(0, RECENT_GAME_LIMIT)));
    } catch (_) {
      // History is optional; the simulator still works if storage is unavailable.
    }
  }

  function recentGameLabel(entry) {
    const finish = entry.finish && entry.finish !== "REG" ? ` (${entry.finish})` : "";
    return `${entry.awayCode} ${entry.awayScore} @ ${entry.homeCode} ${entry.homeScore}${finish} · Seed ${entry.seed}`;
  }

  function renderRecentGames() {
    if (!elements.recentGamesSelect) return;
    elements.recentGamesSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = recentGames.length
      ? `Last ${Math.min(recentGames.length, RECENT_GAME_LIMIT)} completed game${recentGames.length === 1 ? "" : "s"}`
      : "No completed games yet";
    elements.recentGamesSelect.append(placeholder);
    for (const entry of recentGames) {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = recentGameLabel(entry);
      option.title = `${entry.version || "Unknown version"} · ${new Date(entry.completedAt || Date.now()).toLocaleString()}`;
      elements.recentGamesSelect.append(option);
    }
    elements.recentGamesSelect.value = "";
  }

  function saveCurrentGameToHistory(finalEvent) {
    if (currentGameHistorySaved || !finalEvent?.details || !teams || !homeId || !awayId) return;
    const home = teams[homeId];
    const away = teams[awayId];
    const score = finalEvent.details.score || finalEvent.score || {};
    const playedShootout = events.some((event) => event.type === "shootout-start");
    const playedOvertime = events.some((event) => String(event.period) === "4");
    const finish = playedShootout ? "SO" : playedOvertime ? "OT" : "REG";
    const entry = {
      id: `${SIMULATOR_VERSION}|${lineupIdentityToken(away)}|${lineupIdentityToken(home)}|${game.seed}`,
      version: SIMULATOR_VERSION,
      seed: game.seed,
      homeCode: home.abbreviation,
      awayCode: away.abbreviation,
      homeScore: Number(score[homeId] ?? finalEvent.score?.[homeId] ?? 0),
      awayScore: Number(score[awayId] ?? finalEvent.score?.[awayId] ?? 0),
      finish,
      completedAt: Date.now()
    };
    recentGames = [entry, ...recentGames.filter((item) => item.id !== entry.id)].slice(0, RECENT_GAME_LIMIT);
    currentGameHistorySaved = true;
    persistRecentGames();
    renderRecentGames();
  }

  async function restoreRecentGame(entryId) {
    const entry = recentGames.find((item) => item.id === entryId);
    if (!entry) return;
    if (elements.homeTeamSelect) elements.homeTeamSelect.value = entry.homeCode;
    if (elements.awayTeamSelect) elements.awayTeamSelect.value = entry.awayCode;
    resetJerseyDefault("home");
    resetJerseyDefault("away");
    syncTeamSelectorLocks();
    if (elements.seedInput) elements.seedInput.value = String(entry.seed);

    const refreshed = await refreshLiveRosterState({ quiet: true });
    if (!refreshed) {
      restoreSelectorsToCurrentGame();
      setStatus("Latest lineup unavailable", "error");
      if (elements.recentGamesSelect) elements.recentGamesSelect.value = "";
      return;
    }

    const created = createNewGame({ freshSeed: false, seedOverride: entry.seed });
    if (!created) restoreSelectorsToCurrentGame();
    if (elements.recentGamesSelect) elements.recentGamesSelect.value = "";
  }

  function setImageAsset(img, src, fallback = null, onState = null) {
    if (!img || !src) return;
    img.hidden = true;
    if (fallback) fallback.hidden = false;
    img.onload = () => {
      img.hidden = false;
      if (fallback) fallback.hidden = true;
      onState?.(true);
    };
    img.onerror = () => {
      img.hidden = true;
      if (fallback) fallback.hidden = false;
      onState?.(false);
    };
    img.src = src;
  }

  function initializeLeagueBranding() {
    const logoPath = window.AVHL_ASSETS?.leagueLogo?.();
    if (!logoPath || !elements.leagueLogo) return;
    setImageAsset(elements.leagueLogo, logoPath, elements.leagueLogoFallback, (ready) => {
      if (!elements.assetStatus) return;
      elements.assetStatus.dataset.ready = ready ? "true" : "false";
      elements.assetStatus.textContent = ready
        ? "AVHL website branding loaded"
        : "AVHL website branding unavailable";
    });
  }

  function jerseyAssetFor(team, selection) {
    if (!team?.assets) return "";
    if (selection === "Home") return team.assets.homeJersey;
    if (selection === "Alt") return team.assets.altJersey;
    return team.assets.awayJersey;
  }

  function applyJerseySelection(side, team) {
    const isHome = side === "home";
    const select = isHome ? elements.homeJerseySelect : elements.awayJerseySelect;
    const image = isHome ? elements.homeJersey : elements.awayJersey;
    const fallback = isHome ? elements.homeJerseyFallback : elements.awayJerseyFallback;
    const selection = select?.value || (isHome ? "Home" : "Away");
    setImageAsset(image, jerseyAssetFor(team, selection), fallback);
  }

  function setCenterIceLogo(img, src) {
    if (!img) return;
    if (!src) {
      img.removeAttribute("href");
      img.setAttribute("opacity", "0");
      return;
    }
    img.setAttribute("href", src);
    img.setAttribute("opacity", "0.14");
  }

  function resetJerseyDefault(side) {
    const select = side === "home" ? elements.homeJerseySelect : elements.awayJerseySelect;
    if (select) select.value = side === "home" ? "Home" : "Away";
  }

  function updateBoxScoreTabLabels(home, away) {
    const labels = {
      "away-skaters": `${away.name} Skaters`,
      "away-goalies": `${away.name} Goalies`,
      "home-skaters": `${home.name} Skaters`,
      "home-goalies": `${home.name} Goalies`
    };
    for (const button of elements.boxScoreTabs) {
      if (labels[button.dataset.boxTab]) button.textContent = labels[button.dataset.boxTab];
    }
  }

  function fitTeamNameElement(node) {
    if (!node) return;
    node.style.removeProperty("font-size");
    node.style.removeProperty("letter-spacing");
    node.style.whiteSpace = "nowrap";
    node.style.lineHeight = "1";

    const available = node.clientWidth;
    if (!available) return;
    let size = Number.parseFloat(window.getComputedStyle(node).fontSize) || 30;
    const minimum = 16;
    while (node.scrollWidth > available && size > minimum) {
      size -= 0.5;
      node.style.fontSize = `${size}px`;
    }

    if (node.scrollWidth > available && node.textContent.includes(" ")) {
      node.style.whiteSpace = "normal";
      node.style.lineHeight = ".92";
    }
  }

  function fitBroadcastTeamNames() {
    fitTeamNameElement(elements.awayName);
    fitTeamNameElement(elements.homeName);
  }

  function fitLiveStatTeamName(node) {
    if (!node) return;
    node.style.removeProperty("font-size");
    node.style.whiteSpace = "nowrap";
    const available = Math.max(0, node.clientWidth - 12);
    if (!available) return;
    let size = Number.parseFloat(window.getComputedStyle(node).fontSize) || 16;
    const minimum = 11;
    while (node.scrollWidth > available && size > minimum) {
      size -= 0.5;
      node.style.fontSize = `${size}px`;
    }
  }

  function fitLiveStatTeamNames() {
    fitLiveStatTeamName(elements.statsAwayName);
    fitLiveStatTeamName(elements.statsHomeName);
  }

  function formatTeamRecord(record) {
    const wins = Number(record?.wins) || 0;
    const losses = Number(record?.losses) || 0;
    const otl = Number(record?.otl) || 0;
    return `${wins} - ${losses} - ${otl}`;
  }

  function applyTeamBranding(home, away) {
    document.documentElement.style.setProperty("--home", home.primaryColor);
    document.documentElement.style.setProperty("--away", away.primaryColor);
    document.documentElement.style.setProperty("--home-secondary", home.secondaryColor ?? "#ffffff");
    document.documentElement.style.setProperty("--away-secondary", away.secondaryColor ?? "#ffffff");
    document.documentElement.style.setProperty("--home-tertiary", home.tertiaryColor ?? "#ffffff");
    document.documentElement.style.setProperty("--away-tertiary", away.tertiaryColor ?? "#ffffff");

    elements.homePanel.style.setProperty("--team-color", home.primaryColor);
    elements.homePanel.style.setProperty("--team-secondary", home.secondaryColor ?? "#ffffff");
    elements.awayPanel.style.setProperty("--team-color", away.primaryColor);
    elements.awayPanel.style.setProperty("--team-secondary", away.secondaryColor ?? "#ffffff");
    if (elements.homeCity) elements.homeCity.textContent = home.city || "Home";
    if (elements.awayCity) elements.awayCity.textContent = away.city || "Away";
    if (elements.homeAbbr) elements.homeAbbr.textContent = home.abbreviation;
    if (elements.awayAbbr) elements.awayAbbr.textContent = away.abbreviation;
    if (elements.homeLogoFallback) elements.homeLogoFallback.textContent = home.abbreviation;
    if (elements.awayLogoFallback) elements.awayLogoFallback.textContent = away.abbreviation;
    const catalog = window.AVHL_TEAM_CATALOG ?? {};
    const homeRecord = home.record ?? catalog[home.abbreviation]?.record;
    const awayRecord = away.record ?? catalog[away.abbreviation]?.record;
    if (elements.homeRecord) elements.homeRecord.textContent = formatTeamRecord(homeRecord);
    if (elements.awayRecord) elements.awayRecord.textContent = formatTeamRecord(awayRecord);
    if (elements.arenaName) elements.arenaName.textContent = home.arenaName || "AVHL Arena";
    document.querySelectorAll("[data-home-arena-name]").forEach((node) => {
      node.textContent = home.arenaName || "AVHL Arena";
    });
    if (elements.matchupLabel) elements.matchupLabel.textContent = `${away.abbreviation} at ${home.abbreviation}`;
    updateBoxScoreTabLabels(home, away);

    setImageAsset(elements.homeLogo, home.assets?.logo, elements.homeLogoFallback);
    setImageAsset(elements.awayLogo, away.assets?.logo, elements.awayLogoFallback);
    applyJerseySelection("home", home);
    applyJerseySelection("away", away);
    setCenterIceLogo(elements.replayCenterLogo, home.assets?.logo);
    setCenterIceLogo(elements.eventCenterLogo, home.assets?.logo);
  }

  function matchupTeams() {
    const catalog = window.AVHL_TEAM_CATALOG ?? {};
    return Object.values(catalog).slice().sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  function populateTeamSelectors() {
    if (!elements.homeTeamSelect || !elements.awayTeamSelect) return;
    const catalogTeams = matchupTeams();
    for (const select of [elements.homeTeamSelect, elements.awayTeamSelect]) {
      select.replaceChildren(...catalogTeams.map((team) => {
        const option = document.createElement("option");
        option.value = team.abbreviation;
        option.textContent = `${team.city} ${team.name} (${team.abbreviation})`;
        return option;
      }));
    }
    elements.homeTeamSelect.value = "ARI";
    elements.awayTeamSelect.value = "ATL";
    resetJerseyDefault("home");
    resetJerseyDefault("away");
    syncTeamSelectorLocks();
  }

  function syncTeamSelectorLocks() {
    if (!elements.homeTeamSelect || !elements.awayTeamSelect) return;
    const homeCode = elements.homeTeamSelect.value;
    const awayCode = elements.awayTeamSelect.value;
    for (const option of elements.homeTeamSelect.options) {
      option.disabled = option.value === awayCode;
    }
    for (const option of elements.awayTeamSelect.options) {
      option.disabled = option.value === homeCode;
    }
  }

  function selectedMatchupData() {
    const homeCode = elements.homeTeamSelect?.value || "ARI";
    const awayCode = elements.awayTeamSelect?.value || "ATL";
    if (homeCode === awayCode) throw new Error("Home and away teams must be different.");
    return window.AVHL_CREATE_MATCHUP_DATA
      ? window.AVHL_CREATE_MATCHUP_DATA(homeCode, awayCode)
      : window.AVHL_DATA;
  }

  async function refreshLiveRosterState({ quiet = false } = {}) {
    if (!window.AVHL_LOAD_LIVE_ROSTERS) return null;
    if (!quiet) setStatus("Refreshing rosters + lineups…", "ready");
    try {
      const rosterStatus = await window.AVHL_LOAD_LIVE_ROSTERS();
      const lineupSources = Object.values(rosterStatus.lineupSources || {});
      const savedCount = lineupSources.filter((source) => source === "saved").length;
      const repairCount = lineupSources.filter((source) => source === "sim-repaired").length;
      console.info(`AVHL simulator rosters: ${rosterStatus.playerCount} players across ${rosterStatus.teamCount} teams (${rosterStatus.source}); ${savedCount} owner lineups; ${repairCount} temporary sim repairs`);
      if (elements.assetStatus) {
        elements.assetStatus.dataset.ready = rosterStatus.source === "live" ? "true" : "false";
        elements.assetStatus.textContent = rosterStatus.source === "live"
          ? `Live CSV rosters + latest lineups loaded (${rosterStatus.playerCount} players · ${savedCount} owner · ${repairCount} temporary repairs)`
          : `Roster source: ${rosterStatus.source} (${rosterStatus.playerCount})`;
      }
      return rosterStatus;
    } catch (error) {
      console.warn("Live AVHL rosters/lineups unavailable; refusing to start a new game with potentially stale lineup data.", error);
      if (elements.assetStatus) {
        elements.assetStatus.dataset.ready = "false";
        elements.assetStatus.textContent = "Latest rosters/lineups unavailable — retry before starting";
      }
      return null;
    }
  }

  function restoreSelectorsToCurrentGame() {
    if (!teams || !homeId || !awayId) return;
    if (elements.homeTeamSelect && teams[homeId]?.abbreviation) {
      elements.homeTeamSelect.value = teams[homeId].abbreviation;
    }
    if (elements.awayTeamSelect && teams[awayId]?.abbreviation) {
      elements.awayTeamSelect.value = teams[awayId].abbreviation;
    }
    syncTeamSelectorLocks();
  }

  async function handleHomeTeamChange() {
    resetJerseyDefault("home");
    syncTeamSelectorLocks();
    const refreshed = await refreshLiveRosterState({ quiet: true });
    if (!refreshed) {
      restoreSelectorsToCurrentGame();
      setStatus("Latest lineup unavailable", "error");
      return;
    }
    if (!createNewGame()) restoreSelectorsToCurrentGame();
  }

  async function handleAwayTeamChange() {
    resetJerseyDefault("away");
    syncTeamSelectorLocks();
    const refreshed = await refreshLiveRosterState({ quiet: true });
    if (!refreshed) {
      restoreSelectorsToCurrentGame();
      setStatus("Latest lineup unavailable", "error");
      return;
    }
    if (!createNewGame()) restoreSelectorsToCurrentGame();
  }

  function handleJerseyChange(side) {
    if (!teams || !homeId || !awayId) return;
    applyJerseySelection(side, side === "home" ? teams[homeId] : teams[awayId]);
  }

  function getPlayer(playerId) {
    if (!playerId || !teams) return null;
    for (const team of Object.values(teams)) {
      if (team.playerById?.[playerId]) return team.playerById[playerId];
      if (team.goalie?.id === playerId) return team.goalie;
      if (team.backup?.id === playerId) return team.backup;
    }
    return null;
  }

  function shortName(player) {
    if (!player?.name) return "Unknown";
    const parts = player.name.trim().split(/\s+/);
    return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
  }

  function rinkPoint(location) {
    return window.AVHL_RINK_GEOMETRY.toSvg(location);
  }

  function createSvgElement(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, String(value));
    }
    return element;
  }

  function setStatus(text, mode = "ready") {
    elements.statusPill.textContent = text;
    elements.statusPill.dataset.mode = mode;
  }

  function stopPlayback() {
    playing = false;
    window.clearTimeout(timer);
    timer = null;
    elements.playButton.textContent = "Play";
    if (currentEventIndex >= events.length - 1) setStatus("Final", "final");
    else if (currentEventIndex < 0) setStatus("Ready", "ready");
    else setStatus("Paused", "paused");
  }

  function startPlayback() {
    playing = true;
    elements.playButton.textContent = "Pause";
    setStatus("Live", "live");
    stepForward();
  }

  function createNewGame(options = {}) {
    stopPlayback();
    cancelReplay();
    const freshSeed = options.freshSeed !== false;
    const overrideSeed = Number(options.seedOverride);
    const enteredSeed = Number(elements.seedInput.value);
    let seed;
    if (Number.isFinite(overrideSeed) && overrideSeed > 0) {
      seed = Math.floor(overrideSeed) >>> 0 || 1;
    } else if (freshSeed) {
      seed = generateSeed();
    } else if (Number.isFinite(enteredSeed) && enteredSeed > 0) {
      seed = Math.floor(enteredSeed) >>> 0 || 1;
    } else {
      seed = generateSeed();
    }
    try {
      const matchupData = selectedMatchupData();
      currentGameInput = cloneData(matchupData);
      const simulator = new window.AVHLGameSimulator(matchupData, seed);
      const nextGame = simulator.simulateGame();
      elements.seedInput.value = String(seed);
      game = nextGame;
      events = game.events;
      teams = game.teams;
      homeId = game.homeId;
      awayId = game.awayId;
      currentEventIndex = -1;
      encounteredGoals = [];
      currentReplayEventId = null;
      currentGameHistorySaved = false;
      resetDisplay();
      return true;
    } catch (error) {
      console.error(error);
      stopPlayback();
      elements.feed.innerHTML = `<div class="feed-error">Simulator error: ${escapeHtml(error.message)}</div>`;
      setStatus("Error", "error");
      return false;
    }
  }

  function resetDisplay() {
    window.AVHL_RINK_GEOMETRY.ensureSvg(elements.replayRink);
    window.AVHL_RINK_GEOMETRY.ensureSvg(elements.eventRink);
    const home = teams[homeId];
    const away = teams[awayId];
    applyTeamBranding(home, away);
    elements.homeName.textContent = home.name;
    elements.awayName.textContent = away.name;
    fitBroadcastTeamNames();
    window.requestAnimationFrame(fitBroadcastTeamNames);
    elements.statsHomeName.textContent = home.name;
    elements.statsAwayName.textContent = away.name;
    fitLiveStatTeamNames();
    window.requestAnimationFrame(fitLiveStatTeamNames);
    elements.homeScore.textContent = "0";
    elements.awayScore.textContent = "0";
    elements.homeShots.textContent = "0 shots";
    elements.awayShots.textContent = "0 shots";
    elements.period.textContent = "1st";
    elements.clock.textContent = "20:00";
    elements.strength.textContent = "5-on-5";
    elements.feed.innerHTML = `<div class="feed-empty">Press Play to start at the opening faceoff.</div>`;
    elements.eventCount.textContent = "0 events shown";
    elements.summary.textContent = "A final box-score summary will appear here when the game ends.";
    updateLiveStats({
      shots: { [homeId]: 0, [awayId]: 0 },
      attempts: { [homeId]: 0, [awayId]: 0 },
      hits: { [homeId]: 0, [awayId]: 0 },
      faceoffs: { [homeId]: 0, [awayId]: 0 },
      pim: { [homeId]: 0, [awayId]: 0 }
    });
    elements.goalSelect.innerHTML = `<option value="">No goals yet</option>`;
    elements.goalSelect.disabled = true;
    updateGoalCreditDisplay(null);
    elements.replayButton.disabled = true;
    elements.replayButton.textContent = "Play";
    elements.replayProgress.disabled = true;
    elements.replayProgress.value = "0";
    elements.replayTime.textContent = "−6.0s";
    elements.replayState.textContent = "Paused";
    currentReplayEvent = null;
    replayPlayerNodes = new Map();
    replayElapsed = 0;
    replayPlaying = false;
    elements.replayPlayers.innerHTML = "";
    elements.replayTrails.innerHTML = "";
    elements.replayPuck.setAttribute("opacity", "0");
    elements.replayRink?.querySelectorAll(".goal-light").forEach((light) => light.classList.remove("active"));
    elements.replayCaption.textContent = "The first completed goal will appear here.";
    elements.eventMarkers.innerHTML = "";
    elements.periodFilter.value = "all";
    resetFullBoxScore();
    setStatus("Ready", "ready");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function displayPeriod(event) {
    return event.period === "SO" ? "SO" : event.periodLabel;
  }

  function renderEvent(event, options = {}) {
    const appendFeed = options.appendFeed !== false;
    const updateMap = options.updateMap !== false;
    elements.homeScore.textContent = String(event.score[homeId]);
    elements.awayScore.textContent = String(event.score[awayId]);
    elements.homeShots.textContent = `${event.shots[homeId]} shot${event.shots[homeId] === 1 ? "" : "s"}`;
    elements.awayShots.textContent = `${event.shots[awayId]} shot${event.shots[awayId] === 1 ? "" : "s"}`;
    elements.period.textContent = displayPeriod(event);
    elements.clock.textContent = event.clockText;
    elements.strength.textContent = event.type === "final" ? "Final" : event.strength;
    updateLiveStats(event);

    if (appendFeed) appendFeedRow(event);

    if (event.type === "goal" && event.replay) {
      registerGoal(event);
      loadGoalReplay(event);
    }

    if (event.type === "final") {
      renderFinalSummary(event.details);
      renderFullBoxScore(event.details);
      if (isHistoricalReplay) {
        elements.officialExportButton.disabled = true;
        elements.officialExportButton.textContent = `Game ${historicalReplayGameId} Locked`;
        elements.officialStatus.textContent = `Official Replay · Game ${historicalReplayGameId}`;
        elements.officialStatus.classList.add("verified");
      } else {
        elements.officialExportButton.disabled = false;
        elements.officialStatus.textContent = "Final · sandbox game";
        saveCurrentGameToHistory(event);
      }
      stopPlayback();
    }

    if (updateMap && event.mapType) scheduleMapRender();
  }

  function feedEventClass(event) {
    if (event.type === "goal") return "goal";
    if (event.type === "injury") return "injury";
    if (event.type === "penalty" || event.type === "fight") return "penalty";
    if (event.type === "period-start" || event.type === "period-end" || event.type === "final") return "divider";
    if (event.type === "shot" || event.type === "shot-attempt") return "shot";
    return "";
  }

  function createPlayerTile(event) {
    const player = getPlayer(event.playerId);
    const team = event.teamId ? teams[event.teamId] : null;
    if (!player || !team) {
      return `<div class="event-player placeholder" aria-hidden="true"><span>•</span></div>`;
    }
    const initials = player.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
    const headshot = player.headshot
      ? `<img src="${escapeHtml(player.headshot)}" alt="${escapeHtml(player.name)}" />`
      : team.assets?.logo
        ? `<img class="event-team-logo" src="${escapeHtml(team.assets.logo)}" alt="" onerror="this.remove(); this.parentElement.querySelector('span').hidden=false" /><span hidden>${escapeHtml(player.number ?? initials)}</span>`
        : `<span>${escapeHtml(player.number ?? initials)}</span>`;
    return `
      <div class="event-player" style="--event-team:${escapeHtml(team.primaryColor)}" title="${escapeHtml(player.name)}">
        ${headshot}
      </div>
    `;
  }

  function appendFeedRow(event) {
    if (elements.feed.querySelector(".feed-empty")) elements.feed.innerHTML = "";
    const row = document.createElement("div");
    row.className = `feed-row ${feedEventClass(event)}`;
    const teamClass = event.teamId === homeId ? "home-text" : event.teamId === awayId ? "away-text" : "";
    row.innerHTML = `
      ${createPlayerTile(event)}
      <div class="feed-copy">
        <span class="event-time">${escapeHtml(displayPeriod(event))} · ${escapeHtml(event.clockText)} · ${escapeHtml(event.strength)}</span>
        <span class="event-text ${teamClass}">${escapeHtml(event.text)}</span>
      </div>
    `;
    elements.feed.append(row);

    while (elements.feed.children.length > 180) {
      elements.feed.firstElementChild?.remove();
    }
    elements.feed.scrollTop = elements.feed.scrollHeight;
    elements.eventCount.textContent = `${currentEventIndex + 1} of ${events.length} events`;
  }

  function updateLiveStats(snapshot) {
    elements.statsHomeShots.textContent = String(snapshot.shots?.[homeId] ?? 0);
    elements.statsAwayShots.textContent = String(snapshot.shots?.[awayId] ?? 0);
    elements.statsHomeAttempts.textContent = String(snapshot.attempts?.[homeId] ?? 0);
    elements.statsAwayAttempts.textContent = String(snapshot.attempts?.[awayId] ?? 0);
    elements.statsHomeHits.textContent = String(snapshot.hits?.[homeId] ?? 0);
    elements.statsAwayHits.textContent = String(snapshot.hits?.[awayId] ?? 0);
    elements.statsHomeFaceoffs.textContent = String(snapshot.faceoffs?.[homeId] ?? 0);
    elements.statsAwayFaceoffs.textContent = String(snapshot.faceoffs?.[awayId] ?? 0);
    elements.statsHomePim.textContent = String(snapshot.pim?.[homeId] ?? 0);
    elements.statsAwayPim.textContent = String(snapshot.pim?.[awayId] ?? 0);
  }

  function stepForward() {
    if (!playing) return;
    if (currentEventIndex >= events.length - 1) {
      stopPlayback();
      return;
    }
    currentEventIndex += 1;
    renderEvent(events[currentEventIndex]);
    if (!playing) return;
    timer = window.setTimeout(stepForward, Number(elements.speedSelect.value));
  }

  function jumpUntil(predicate) {
    stopPlayback();
    if (currentEventIndex >= events.length - 1) return;
    let target = currentEventIndex + 1;
    while (target < events.length && !predicate(events[target])) target += 1;
    target = Math.min(target, events.length - 1);

    for (let index = currentEventIndex + 1; index <= target; index += 1) {
      currentEventIndex = index;
      const event = events[index];
      const appendFeed =
        index === target ||
        event.type === "goal" ||
        event.type === "penalty" ||
        event.type === "injury" ||
        event.type === "period-start" ||
        event.type === "period-end" ||
        event.type === "shootout-attempt" ||
        event.type === "final";
      renderEvent(event, { appendFeed, updateMap: false });
    }
    renderEventMap();
  }

  function scoringTotalThroughGoal(event, playerId, stat) {
    const normalizedId = normalizePlayerId(playerId);
    const official = officialScoringByPlayer?.[normalizedId] || {};
    const baseTotal = stat === "goal" ? Number(official.goals || 0) : Number(official.assists || 0);
    const targetIndex = encounteredGoals.findIndex((goal) => goal.id === event.id);
    const goalsThroughEvent = targetIndex >= 0 ? encounteredGoals.slice(0, targetIndex + 1) : encounteredGoals;
    if (stat === "goal") {
      return baseTotal + goalsThroughEvent.filter((goal) => normalizePlayerId(goal.playerId) === normalizedId).length;
    }
    return baseTotal + goalsThroughEvent.reduce((total, goal) => {
      return total + ((goal.details?.assists || []).some((id) => normalizePlayerId(id) === normalizedId) ? 1 : 0);
    }, 0);
  }

  function scoreAfterGoalLabel(event) {
    const homeScore = Number(event.score?.[homeId] ?? 0);
    const awayScore = Number(event.score?.[awayId] ?? 0);
    if (homeScore === awayScore) return `${homeScore}-${awayScore} TIE`;
    const leaderId = homeScore > awayScore ? homeId : awayId;
    const highScore = Math.max(homeScore, awayScore);
    const lowScore = Math.min(homeScore, awayScore);
    return `${highScore}-${lowScore} ${teams?.[leaderId]?.abbreviation || ""}`.trim();
  }

  function goalDisplayDetails(event) {
    const scorer = getPlayer(event.playerId);
    const scoringTeam = teams?.[event.teamId];
    const scorerGoalNumber = scoringTotalThroughGoal(event, event.playerId, "goal");
    const assistPlayers = (event.details?.assists || [])
      .map((playerId) => getPlayer(playerId))
      .filter(Boolean);
    const firstLine = `${event.periodLabel} ${event.clockText} — ${scoringTeam?.abbreviation || ""} — ${shortName(scorer)} (${scorerGoalNumber}) — ${scoreAfterGoalLabel(event)}`;
    const secondLine = assistPlayers.length
      ? `From ${assistPlayers.map((player) => `${shortName(player)} (${scoringTotalThroughGoal(event, player.id, "assist")})`).join(", ")}`
      : "Unassisted";
    return { scorer, assistPlayers, firstLine, secondLine };
  }

  function updateGoalCreditDisplay(event) {
    if (!elements.goalAssistLine) return;
    if (!event) {
      elements.goalAssistLine.textContent = "Scoring details will appear here.";
      return;
    }
    elements.goalAssistLine.textContent = goalDisplayDetails(event).secondLine;
  }

  function registerGoal(event) {
    if (!encounteredGoals.some((goal) => goal.id === event.id)) {
      encounteredGoals.push(event);
      const { scorer, assistPlayers, firstLine, secondLine } = goalDisplayDetails(event);
      const option = document.createElement("option");
      option.value = String(event.id);
      option.textContent = firstLine;
      option.title = `${firstLine}\n${secondLine}`;
      elements.goalSelect.append(option);
    }
    elements.goalSelect.disabled = false;
    elements.replayButton.disabled = false;
    elements.replayProgress.disabled = false;
    elements.goalSelect.value = String(event.id);
    updateGoalCreditDisplay(event);
    currentReplayEventId = event.id;
  }

  function cancelReplay() {
    if (replayAnimationFrame) cancelAnimationFrame(replayAnimationFrame);
    replayAnimationFrame = null;
    replayPlaying = false;
    if (elements.replayButton) elements.replayButton.textContent = "Play";
    if (elements.replayState) elements.replayState.textContent = "Paused";
  }

  function interpolateKeyframes(keyframes, time) {
    if (!keyframes?.length) return { x: 100, y: 42.5 };
    if (time <= keyframes[0].t) return keyframes[0];
    if (time >= keyframes.at(-1).t) return keyframes.at(-1);

    // V2.2 replay tracks are densely sampled (normally 30 FPS), so a direct
    // index estimate avoids scanning hundreds of frames every animation tick.
    const duration = keyframes.at(-1).t || 1;
    let index = Math.floor((time / duration) * (keyframes.length - 1));
    index = Math.max(0, Math.min(keyframes.length - 2, index));
    while (index > 0 && time < keyframes[index].t) index -= 1;
    while (index < keyframes.length - 2 && time > keyframes[index + 1].t) index += 1;

    const start = keyframes[index];
    const end = keyframes[index + 1];
    const span = Math.max(0.001, end.t - start.t);
    const progress = Math.max(0, Math.min(1, (time - start.t) / span));
    return {
      x: start.x + (end.x - start.x) * progress,
      y: start.y + (end.y - start.y) * progress
    };
  }

  function replayClockText(elapsed) {
    const buildup = currentReplayEvent?.replay?.buildupSeconds ?? 6;
    const relative = elapsed - buildup;
    if (Math.abs(relative) < 0.035) return "GOAL";
    if (relative < 0) return `−${Math.abs(relative).toFixed(1)}s`;
    return `+${relative.toFixed(1)}s`;
  }

  function setGoalLightState(replay, elapsed) {
    if (!elements.replayRink) return;
    const lights = elements.replayRink.querySelectorAll(".goal-light");
    lights.forEach((light) => light.classList.remove("active"));
    if (!replay?.goalLight) return;
    const { end, activatesAt = replay.buildupSeconds ?? 6, deactivatesAt = replay.durationSeconds ?? 8 } = replay.goalLight;
    if (elapsed + 1e-6 < activatesAt || elapsed > deactivatesAt + 1e-6) return;
    const active = elements.replayRink.querySelector(`.goal-light[data-goal-light-end="${end}"]`);
    active?.classList.add("active");
  }

  function renderReplayFrame(elapsed) {
    if (!currentReplayEvent?.replay) return;
    const replay = currentReplayEvent.replay;
    replayElapsed = Math.max(0, Math.min(replay.durationSeconds, elapsed));
    setGoalLightState(replay, replayElapsed);

    for (const track of replay.tracks) {
      const position = interpolateKeyframes(track.keyframes, replayElapsed);
      const point = rinkPoint(position);
      replayPlayerNodes.get(track.playerId)?.setAttribute("transform", `translate(${point.x} ${point.y})`);
    }

    const puckPosition = interpolateKeyframes(replay.puck, replayElapsed);
    const puckPoint = rinkPoint(puckPosition);
    elements.replayPuck.setAttribute("cx", puckPoint.x);
    elements.replayPuck.setAttribute("cy", puckPoint.y);
    elements.replayProgress.value = String(replayElapsed);
    elements.replayTime.textContent = replayClockText(replayElapsed);
  }

  function loadGoalReplay(event) {
    if (!event?.replay) return;
    window.AVHL_RINK_GEOMETRY.ensureSvg(elements.replayRink);
    cancelReplay();
    currentReplayEvent = event;
    currentReplayEventId = event.id;
    elements.goalSelect.value = String(event.id);
    updateGoalCreditDisplay(event);
    elements.replayPlayers.replaceChildren();
    elements.replayTrails.replaceChildren();
    elements.replayPuck.setAttribute("opacity", "1");
    elements.replayCaption.textContent = event.text;
    elements.replayButton.disabled = false;
    elements.replayProgress.disabled = false;
    elements.replayProgress.max = String(event.replay.durationSeconds);
    elements.replayState.textContent = "Paused";
    elements.replayRink?.querySelectorAll(".goal-light").forEach((light) => light.classList.remove("active"));
    replayPlayerNodes = new Map();

    for (const track of event.replay.tracks) {
      const team = teams[track.teamId];
      const group = createSvgElement("g", { class: `replay-player ${track.role} ${track.isGoalie ? "goalie" : ""}` });
      const circle = createSvgElement("circle", {
        r: track.isGoalie ? 14 : 12,
        fill: team.primaryColor,
        stroke: "none"
      });
      const number = createSvgElement("text", {
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-size": track.number >= 10 ? 10 : 11,
        "font-weight": 900,
        fill: team.numberColor ?? team.secondaryColor ?? "#ffffff"
      });
      number.textContent = track.number;
      group.append(circle, number);
      const title = createSvgElement("title");
      title.textContent = `${track.name}${track.isGoalie ? " (G)" : ""}`;
      group.append(title);
      elements.replayPlayers.append(group);
      replayPlayerNodes.set(track.playerId, group);

      // V6.7.1 intentionally draws no scorer/assist trajectory trails.

    }

    renderReplayFrame(0);
  }

  function pauseGoalReplay() {
    cancelReplay();
  }

  function startGoalReplay() {
    if (!currentReplayEvent?.replay) return;
    const duration = currentReplayEvent.replay.durationSeconds;
    if (replayElapsed >= duration - 0.01) renderReplayFrame(0);
    replayPlaying = true;
    elements.replayButton.textContent = "Pause";
    elements.replayState.textContent = "Playing";
    replayStartedAt = performance.now() - replayElapsed * 1000;

    const animate = (timestamp) => {
      if (!replayPlaying || !currentReplayEvent?.replay) return;
      const elapsed = Math.min(duration, (timestamp - replayStartedAt) / 1000);
      renderReplayFrame(elapsed);
      if (elapsed < duration) {
        replayAnimationFrame = requestAnimationFrame(animate);
      } else {
        replayAnimationFrame = null;
        replayPlaying = false;
        elements.replayButton.textContent = "Play";
        elements.replayState.textContent = "Complete";
      }
    };
    replayAnimationFrame = requestAnimationFrame(animate);
  }

  function toggleGoalReplay() {
    if (replayPlaying) pauseGoalReplay();
    else startGoalReplay();
  }

  function selectedMapTypes() {
    return new Set(
      [...document.querySelectorAll("[data-map-type]")]
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.dataset.mapType)
    );
  }

  function mapEventIsVisible(event, selectedTypes, periodFilter) {
    if (!event.mapType || !selectedTypes.has(event.mapType)) return false;
    if (periodFilter === "all") return true;
    return String(event.period) === periodFilter;
  }

  function markerTitle(event) {
    const player = getPlayer(event.playerId);
    const playerText = player ? `${player.name} — ` : "";
    const coordinateText = event.location
      ? ` (${event.location.x.toFixed(1)}, ${event.location.y.toFixed(1)})`
      : "";
    return `${event.periodLabel} ${event.clockText}: ${playerText}${event.text}${coordinateText}`;
  }

  function markerForEvent(event) {
    const team = event.teamId ? teams[event.teamId] : null;
    const color = team?.primaryColor ?? "#7b879e";
    let markerPadding = 5;
    if (event.mapType === "shot" && event.outcome === "goal") markerPadding = 8;
    else if (event.mapType === "penalty") markerPadding = 7;
    else if (event.mapType === "hit") markerPadding = 6;
    const point = window.AVHL_RINK_GEOMETRY.markerPoint(event.location, markerPadding);
    let node;

    if (event.mapType === "shot") {
      if (event.outcome === "goal") {
        node = createSvgElement("g", { class: "event-marker goal-marker" });
        const outer = createSvgElement("circle", { r: 7.5, fill: color, stroke: "#ffffff", "stroke-width": 2.2 });
        const inner = createSvgElement("circle", { r: 2.4, fill: "#ffffff" });
        node.append(outer, inner);
      } else {
        node = createSvgElement("circle", {
          class: "event-marker shot-marker",
          r: 4.4,
          fill: color,
          stroke: "#ffffff",
          "stroke-width": 1.2
        });
      }
    } else if (event.mapType === "attempt") {
      node = createSvgElement("g", { class: `event-marker attempt-marker ${event.outcome}` });
      if (event.outcome === "blocked") {
        node.append(createSvgElement("rect", {
          x: -4.3,
          y: -4.3,
          width: 8.6,
          height: 8.6,
          rx: 1.5,
          fill: "none",
          stroke: color,
          "stroke-width": 2.3
        }));
      } else if (event.outcome === "post") {
        node.append(createSvgElement("path", {
          d: "M 0 -5.6 L 5.6 0 L 0 5.6 L -5.6 0 Z",
          fill: "none",
          stroke: color,
          "stroke-width": 2.3
        }));
      } else {
        node.append(createSvgElement("line", { x1: -4.5, y1: -4.5, x2: 4.5, y2: 4.5, stroke: color, "stroke-width": 2 }));
        node.append(createSvgElement("line", { x1: 4.5, y1: -4.5, x2: -4.5, y2: 4.5, stroke: color, "stroke-width": 2 }));
      }
    } else if (event.mapType === "hit") {
      node = createSvgElement("path", {
        class: "event-marker hit-marker",
        d: "M 0 -6 L 6 5 L -6 5 Z",
        fill: color,
        stroke: "#ffffff",
        "stroke-width": 1.1
      });
    } else if (event.mapType === "penalty") {
      node = createSvgElement("g", { class: "event-marker penalty-marker" });
      const circle = createSvgElement("circle", { r: 7, fill: color, stroke: "#ffffff", "stroke-width": 1.3 });
      const text = createSvgElement("text", {
        "text-anchor": "middle",
        "dominant-baseline": "central",
        "font-size": 9,
        "font-weight": 900,
        fill: "#07111f"
      });
      text.textContent = "P";
      node.append(circle, text);
    } else {
      node = createSvgElement("circle", {
        class: "event-marker faceoff-marker",
        r: 3.2,
        fill: color,
        stroke: "#ffffff",
        "stroke-width": 1
      });
    }

    node.setAttribute("transform", `translate(${point.x} ${point.y})`);
    node.dataset.eventId = String(event.id);
    const title = createSvgElement("title");
    title.textContent = markerTitle(event);
    node.append(title);
    node.addEventListener("mouseenter", (pointerEvent) => showMapTooltip(pointerEvent, event));
    node.addEventListener("mousemove", (pointerEvent) => moveMapTooltip(pointerEvent));
    node.addEventListener("mouseleave", hideMapTooltip);
    return node;
  }

  function scheduleMapRender() {
    if (mapRenderQueued) return;
    mapRenderQueued = true;
    requestAnimationFrame(() => {
      mapRenderQueued = false;
      renderEventMap();
    });
  }

  function markerPriority(event) {
    if (event.mapType === "faceoff") return 0;
    if (event.mapType === "hit") return 1;
    if (event.mapType === "penalty") return 2;
    if (event.mapType === "attempt") return 3;
    if (event.mapType === "shot" && event.outcome !== "goal") return 4;
    if (event.mapType === "shot" && event.outcome === "goal") return 5;
    return 0;
  }

  function renderEventMap() {
    if (!game) return;
    window.AVHL_RINK_GEOMETRY.ensureSvg(elements.eventRink);
    const selectedTypes = selectedMapTypes();
    const periodFilter = elements.periodFilter.value;
    const visible = events
      .slice(0, currentEventIndex + 1)
      .filter((event) => mapEventIsVisible(event, selectedTypes, periodFilter))
      .sort((a, b) => markerPriority(a) - markerPriority(b) || a.id - b.id);
    const fragment = document.createDocumentFragment();
    visible.forEach((event) => fragment.append(markerForEvent(event)));
    elements.eventMarkers.replaceChildren(fragment);
  }

  function showMapTooltip(pointerEvent, event) {
    elements.mapTooltip.hidden = false;
    elements.mapTooltip.textContent = markerTitle(event);
    moveMapTooltip(pointerEvent);
  }

  function moveMapTooltip(pointerEvent) {
    const wrap = elements.mapTooltip.parentElement.getBoundingClientRect();
    elements.mapTooltip.style.left = `${pointerEvent.clientX - wrap.left + 10}px`;
    elements.mapTooltip.style.top = `${pointerEvent.clientY - wrap.top + 10}px`;
  }

  function hideMapTooltip() {
    elements.mapTooltip.hidden = true;
  }


  function formatStatTime(seconds, padMinutes = false) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    const secs = total % 60;
    return `${padMinutes ? String(minutes).padStart(2, "0") : minutes}:${String(secs).padStart(2, "0")}`;
  }

  function formatPim(minutes) {
    const totalSeconds = Math.max(0, Math.round((Number(minutes) || 0) * 60));
    return formatStatTime(totalSeconds, true);
  }

  function skaterShotPercentage(row) {
    if (!row?.shots) return "0.0%";
    return `${((row.goals / row.shots) * 100).toFixed(1)}%`;
  }

  function faceoffPercentage(row) {
    const attempts = (row?.faceoffWins || 0) + (row?.faceoffLosses || 0);
    if (!attempts) return "0.0%";
    return `${(((row.faceoffWins || 0) / attempts) * 100).toFixed(1)}%`;
  }

  function goalieSavePercentageFull(stats) {
    if (!stats?.shotsAgainst) return "0.000";
    return (stats.saves / stats.shotsAgainst).toFixed(3);
  }

  function goalieGaa(stats) {
    const toi = Number(stats?.toi) || 0;
    if (!toi) return "0.00";
    return (((Number(stats.goalsAgainst) || 0) * 3600) / toi).toFixed(2);
  }

  function plusMinusText(value) {
    const number = Number(value) || 0;
    return number > 0 ? `+${number}` : String(number);
  }

  function injuryGamesText(gamesMissed, { prefix = false } = {}) {
    const games = Math.max(0, Number(gamesMissed) || 0);
    const text = `${games} ${games === 1 ? "game" : "games"}`;
    return prefix ? `Out ${text}` : text;
  }

  function resetFullBoxScore() {
    activeBoxTab = "team";
    boxScoreSortByTab = Object.create(null);
    officialVerifiedGameId = null;
    elements.boxScoreTabs.forEach((button) => {
      const active = button.dataset.boxTab === activeBoxTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    elements.boxScoreContent.innerHTML = `<div class="boxscore-empty">Finish the game to unlock the complete box score.</div>`;
    elements.officialExportButton.disabled = true;
    elements.officialExportButton.textContent = "Verify Official Game";
    elements.officialStatus.textContent = "Sandbox game";
    elements.officialStatus.classList.remove("verified");
    closeOfficialModal();
  }

  function teamStatValue(summary, teamId, key) {
    return summary?.teamStats?.[teamId]?.[key] ?? 0;
  }

  function teamPassingPercent(summary, teamId) {
    const attempts = teamStatValue(summary, teamId, "passAttempts");
    const completions = teamStatValue(summary, teamId, "passCompletions");
    return attempts ? `${((completions / attempts) * 100).toFixed(1)}%` : "0.0%";
  }

  function teamLogoMarkup(team) {
    if (!team?.assets?.logo) return "";
    return `<img class="boxscore-team-logo" src="${escapeHtml(team.assets.logo)}" alt="${escapeHtml(team.fullName || team.name)} logo" onerror="this.remove()" />`;
  }

  function renderTeamBoxScore(summary) {
    const away = teams[awayId];
    const home = teams[homeId];
    const rows = [
      ["TOTAL SHOTS", teamStatValue(summary, awayId, "shots"), teamStatValue(summary, homeId, "shots")],
      ["HITS", teamStatValue(summary, awayId, "hits"), teamStatValue(summary, homeId, "hits")],
      ["TIME ON ATTACK", formatStatTime(teamStatValue(summary, awayId, "timeOnAttack"), true), formatStatTime(teamStatValue(summary, homeId, "timeOnAttack"), true)],
      ["PASSING", teamPassingPercent(summary, awayId), teamPassingPercent(summary, homeId)],
      ["FACEOFFS WON", teamStatValue(summary, awayId, "faceoffsWon"), teamStatValue(summary, homeId, "faceoffsWon")],
      ["PENALTY MINUTES", formatPim(teamStatValue(summary, awayId, "penaltyMinutes")), formatPim(teamStatValue(summary, homeId, "penaltyMinutes"))],
      ["POWERPLAYS", `${teamStatValue(summary, awayId, "powerPlayGoals")} / ${teamStatValue(summary, awayId, "powerPlayOpportunities")}`, `${teamStatValue(summary, homeId, "powerPlayGoals")} / ${teamStatValue(summary, homeId, "powerPlayOpportunities")}`],
      ["POWERPLAY MINUTES", formatStatTime(teamStatValue(summary, awayId, "powerPlayTime"), true), formatStatTime(teamStatValue(summary, homeId, "powerPlayTime"), true)],
      ["SHORTHANDED GOALS", teamStatValue(summary, awayId, "shorthandedGoals"), teamStatValue(summary, homeId, "shorthandedGoals")],
      ["INJURIES", teamStatValue(summary, awayId, "injuries"), teamStatValue(summary, homeId, "injuries")],
      ["PROJECTED MAN-GAMES LOST", teamStatValue(summary, awayId, "manGamesLostProjected"), teamStatValue(summary, homeId, "manGamesLostProjected")]
    ];

    elements.boxScoreContent.innerHTML = `
      <div class="team-boxscore">
        <div class="team-boxscore-scoreline">
          <div class="team-boxscore-identity away">
            ${teamLogoMarkup(away)}
            <div><strong>${escapeHtml(away.abbreviation)}</strong><span>${escapeHtml(away.fullName || away.name)}</span></div>
          </div>
          <div class="team-boxscore-final"><span>FINAL</span><strong>${summary.score[awayId]} – ${summary.score[homeId]}</strong></div>
          <div class="team-boxscore-identity home">
            <div><strong>${escapeHtml(home.abbreviation)}</strong><span>${escapeHtml(home.fullName || home.name)}</span></div>
            ${teamLogoMarkup(home)}
          </div>
        </div>
        <div class="team-boxscore-rows">
          ${rows.map(([label, awayValue, homeValue]) => `
            <div class="team-boxscore-row">
              <strong class="team-boxscore-value away-value">${escapeHtml(awayValue)}</strong>
              <span>${escapeHtml(label)}</span>
              <strong class="team-boxscore-value home-value">${escapeHtml(homeValue)}</strong>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  const SKATER_BOX_COLUMNS = [
    { key: "name", label: "Player", type: "text", value: (row) => String(row?.name || "") },
    { key: "toi", label: "Min", value: (row) => Number(row?.toi) || 0 },
    { key: "goals", label: "G", value: (row) => Number(row?.goals) || 0 },
    { key: "assists", label: "A", value: (row) => Number(row?.assists) || 0 },
    { key: "points", label: "PTS", value: (row) => Number(row?.points) || 0 },
    { key: "plusMinus", label: "+/-", value: (row) => Number(row?.plusMinus) || 0 },
    { key: "shots", label: "S", value: (row) => Number(row?.shots) || 0 },
    { key: "shotPct", label: "S%", value: (row) => (Number(row?.shots) || 0) ? (Number(row?.goals) || 0) / Number(row.shots) : 0 },
    { key: "ppToi", label: "PPT", value: (row) => Number(row?.ppToi) || 0 },
    { key: "penaltyMinutes", label: "PIM", value: (row) => Number(row?.penaltyMinutes) || 0 },
    { key: "hits", label: "Hits", value: (row) => Number(row?.hits) || 0 },
    { key: "powerPlayGoals", label: "PPG", value: (row) => Number(row?.powerPlayGoals) || 0 },
    { key: "shorthandedGoals", label: "SHG", value: (row) => Number(row?.shorthandedGoals) || 0 },
    { key: "faceoffsTaken", label: "FOT", value: (row) => (Number(row?.faceoffWins) || 0) + (Number(row?.faceoffLosses) || 0) },
    { key: "faceoffWins", label: "FOW", value: (row) => Number(row?.faceoffWins) || 0 },
    { key: "faceoffPct", label: "FO%", value: (row) => { const attempts = (Number(row?.faceoffWins) || 0) + (Number(row?.faceoffLosses) || 0); return attempts ? (Number(row?.faceoffWins) || 0) / attempts : 0; } },
  ];

  const GOALIE_BOX_COLUMNS = [
    { key: "name", label: "Player", type: "text", value: (row) => String(row?.name || "") },
    { key: "toi", label: "Min", value: (row) => Number(row?.toi) || 0 },
    { key: "shotsAgainst", label: "SA", value: (row) => Number(row?.shotsAgainst) || 0 },
    { key: "saves", label: "S", value: (row) => Number(row?.saves) || 0 },
    { key: "savePct", label: "SV%", value: (row) => (Number(row?.shotsAgainst) || 0) ? (Number(row?.saves) || 0) / Number(row.shotsAgainst) : 0 },
    { key: "goalsAgainst", label: "GA", value: (row) => Number(row?.goalsAgainst) || 0 },
    { key: "gaa", label: "GAA", value: (row) => (Number(row?.toi) || 0) ? ((Number(row?.goalsAgainst) || 0) * 3600) / Number(row.toi) : 0 },
    { key: "emptyNetGoals", label: "ENG", value: (row) => Number(row?.emptyNetGoals) || 0 },
    { key: "penaltyMinutes", label: "PIM", value: (row) => Number(row?.penaltyMinutes) || 0 },
    { key: "goals", label: "G", value: (row) => Number(row?.goals) || 0 },
    { key: "assists", label: "A", value: (row) => Number(row?.assists) || 0 },
    { key: "points", label: "PTS", value: (row) => Number(row?.points) || 0 },
  ];

  function sortedBoxScoreRows(rows, columns, tabName) {
    const sort = boxScoreSortByTab[tabName];
    if (!sort) return [...rows];
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column) return [...rows];
    return [...rows].sort((a, b) => {
      const left = column.value(a);
      const right = column.value(b);
      let comparison;
      if (column.type === "text") comparison = String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
      else comparison = Number(left) - Number(right);
      if (!comparison) comparison = String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }

  function sortableBoxHeaders(columns, tabName) {
    const sort = boxScoreSortByTab[tabName];
    return columns.map((column) => {
      const active = sort?.key === column.key;
      const indicator = active ? (sort.direction === "asc" ? "▲" : "▼") : "↕";
      const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
      return `<th aria-sort="${ariaSort}"><button type="button" class="boxscore-sort-button${active ? " active" : ""}" data-box-sort-tab="${escapeHtml(tabName)}" data-box-sort-key="${escapeHtml(column.key)}" data-box-sort-type="${escapeHtml(column.type || "number")}"><span>${escapeHtml(column.label)}</span><span class="boxscore-sort-indicator" aria-hidden="true">${indicator}</span></button></th>`;
    }).join("");
  }

  function renderSkaterTable(summary, teamId) {
    const team = teams[teamId];
    const sourceRows = summary?.skaters?.[teamId] || [];
    const rows = sortedBoxScoreRows(sourceRows, SKATER_BOX_COLUMNS, activeBoxTab);
    elements.boxScoreContent.innerHTML = `
      <div class="stat-table-heading">
        <div>${teamLogoMarkup(team)}<div><span>${escapeHtml(team.abbreviation)}</span><strong>${escapeHtml(team.fullName || team.name)} Skaters</strong></div></div>
        <span>${rows.length} skaters dressed · click any column to sort</span>
      </div>
      <div class="stat-table-scroll">
        <table class="official-stat-table skater-stat-table">
          <thead><tr>${sortableBoxHeaders(SKATER_BOX_COLUMNS, activeBoxTab)}</tr></thead>
          <tbody>
            ${rows.map((row) => {
              const fot = (row.faceoffWins || 0) + (row.faceoffLosses || 0);
              return `<tr>
                <td class="player-name-cell"><strong>${escapeHtml(row.name)}</strong><span>#${escapeHtml(row.number)} · ${escapeHtml(row.position)}${row.positionFamiliarity < 1 ? ` · 3% unfamiliar-position penalty` : ""}${row.injury ? ` · INJ: ${escapeHtml(row.injury.bodyArea)} (${escapeHtml(injuryGamesText(row.injury.gamesMissed))})` : ""}</span></td>
                <td>${formatStatTime(row.toi, true)}</td>
                <td>${row.goals || 0}</td><td>${row.assists || 0}</td><td>${row.points || 0}</td><td>${plusMinusText(row.plusMinus)}</td>
                <td>${row.shots || 0}</td><td>${skaterShotPercentage(row)}</td><td>${formatStatTime(row.ppToi, true)}</td><td>${formatPim(row.penaltyMinutes)}</td>
                <td>${row.hits || 0}</td><td>${row.powerPlayGoals || 0}</td><td>${row.shorthandedGoals || 0}</td><td>${fot}</td><td>${row.faceoffWins || 0}</td><td>${faceoffPercentage(row)}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderGoalieTable(summary, teamId) {
    const team = teams[teamId];
    const sourceRows = summary?.goalieRows?.[teamId] || [];
    const rows = sortedBoxScoreRows(sourceRows, GOALIE_BOX_COLUMNS, activeBoxTab);
    elements.boxScoreContent.innerHTML = `
      <div class="stat-table-heading">
        <div>${teamLogoMarkup(team)}<div><span>${escapeHtml(team.abbreviation)}</span><strong>${escapeHtml(team.fullName || team.name)} Goalies</strong></div></div>
        <span>Starter + backup · click any column to sort</span>
      </div>
      <div class="stat-table-scroll">
        <table class="official-stat-table goalie-stat-table">
          <thead><tr>${sortableBoxHeaders(GOALIE_BOX_COLUMNS, activeBoxTab)}</tr></thead>
          <tbody>
            ${rows.map((row) => `<tr>
              <td class="player-name-cell"><strong>${escapeHtml(row.name)}</strong><span>#${escapeHtml(row.number)}${row.starter ? " · Starter" : " · Backup"}${row.injury ? ` · INJ: ${escapeHtml(row.injury.bodyArea)} (${escapeHtml(injuryGamesText(row.injury.gamesMissed))})` : ""}</span></td>
              <td>${formatStatTime(row.toi, true)}</td><td>${row.shotsAgainst || 0}</td><td>${row.saves || 0}</td><td>${goalieSavePercentageFull(row)}</td>
              <td>${row.goalsAgainst || 0}</td><td>${goalieGaa(row)}</td><td>${row.emptyNetGoals || 0}</td><td>${formatPim(row.penaltyMinutes)}</td>
              <td>${row.goals || 0}</td><td>${row.assists || 0}</td><td>${row.points || 0}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderFullBoxScore(summary = game?.finalSummary) {
    if (!summary || currentEventIndex < events.length - 1) return;
    if (activeBoxTab === "team") renderTeamBoxScore(summary);
    else if (activeBoxTab === "away-skaters") renderSkaterTable(summary, awayId);
    else if (activeBoxTab === "away-goalies") renderGoalieTable(summary, awayId);
    else if (activeBoxTab === "home-skaters") renderSkaterTable(summary, homeId);
    else if (activeBoxTab === "home-goalies") renderGoalieTable(summary, homeId);
  }

  function selectBoxScoreTab(tabName) {
    activeBoxTab = tabName;
    elements.boxScoreTabs.forEach((button) => {
      const active = button.dataset.boxTab === tabName;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    if (currentEventIndex >= events.length - 1) renderFullBoxScore(game?.finalSummary);
  }

  function lineupIdentityToken(team) {
    if (!team) return "unknown";
    const source = team.lineupSource === "saved"
      ? `r${Number(team.lineupRevision) || 0}`
      : team.lineupSource === "sim-repaired"
        ? `repair-r${Number(team.lineupRevision) || 0}`
        : "projected";
    const identity = [
      ...(team.forwards || []).map((player) => player.id),
      ...(team.defense || []).map((player) => player.id),
      ...(team.goalies || []).map((player) => player.id),
      ...(team.specialTeams?.pp1 || []),
      ...(team.specialTeams?.pp2 || []),
      ...(team.specialTeams?.pk1 || []),
      ...(team.specialTeams?.pk2 || []),
      ...(team.overtimeUnits || []).flat(),
      ...(team.shootoutOrder || []),
    ].join("|");
    let hash = 2166136261;
    for (let index = 0; index < identity.length; index += 1) {
      hash ^= identity.charCodeAt(index);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return `${team.abbreviation || "TEAM"}-${source}-${hash.toString(16).padStart(8, "0")}`;
  }

  function officialGameId() {
    if (!game || !teams) return "";
    return `${SIMULATOR_VERSION}|${lineupIdentityToken(teams[awayId])}|${lineupIdentityToken(teams[homeId])}|${game.seed}`;
  }

  function officialFinish() {
    const finalEvent = [...events].reverse().find((event) => event.type === "final") || events[events.length - 1];
    if (finalEvent?.period === "SO") return "SO";
    if (Number(finalEvent?.period) === 4) return "OT";
    return "REG";
  }

  function openOfficialModal() {
    if (!game?.finalSummary || currentEventIndex < events.length - 1) return;
    officialPasswordValue = "";
    officialCheckedGameNumber = null;
    elements.officialError.textContent = "";
    elements.officialPassword.value = "";
    elements.officialGameNumber.value = "";
    elements.officialPasswordStep.hidden = false;
    elements.officialGameStep.hidden = true;
    elements.officialMatchup.hidden = true;
    elements.officialMatchup.innerHTML = "";
    elements.officialSaveGame.disabled = true;
    elements.officialModal.hidden = false;
    requestAnimationFrame(() => elements.officialPassword.focus());
  }

  function closeOfficialModal() {
    if (!elements.officialModal) return;
    elements.officialModal.hidden = true;
    officialPasswordValue = "";
    officialCheckedGameNumber = null;
    if (elements.officialPassword) elements.officialPassword.value = "";
    if (elements.officialGameNumber) elements.officialGameNumber.value = "";
    if (elements.officialError) elements.officialError.textContent = "";
    if (elements.officialMatchup) { elements.officialMatchup.hidden = true; elements.officialMatchup.innerHTML = ""; }
    if (elements.officialSaveGame) elements.officialSaveGame.disabled = true;
  }

  async function verifyOfficialPassword(password) {
    const response = await fetch("/api/sim-export-auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }), cache: "no-store" });
    if (response.status === 401) return false;
    if (!response.ok) throw new Error("Administrator password verification is unavailable.");
    const payload = await response.json();
    return Boolean(payload?.ok);
  }

  function buildOfficialReplaySnapshot(gameNumber) {
    if (!game?.finalSummary || !currentGameInput || !events.length) throw new Error("The completed game is missing replay state.");
    return {
      schema: "avhl-official-replay-v1",
      replayFormatVersion: "event-timeline-v1",
      gameId: Number(gameNumber),
      simulatorVersion: SIMULATOR_VERSION,
      simGameId: officialGameId(),
      capturedAt: new Date().toISOString(),
      seed: game.seed,
      homeId,
      awayId,
      jerseySelections: {
        home: elements.homeJerseySelect?.value || "Home",
        away: elements.awayJerseySelect?.value || "Away",
      },
      matchupData: cloneData(currentGameInput),
      events: cloneData(events),
      finalSummary: cloneData(game.finalSummary),
    };
  }

  function historicalTeam(rawTeam, isHome) {
    const team = cloneData(rawTeam);
    const forwards = team.forwards || [];
    const defense = team.defense || [];
    const goalies = team.goalies || [];
    const players = [...forwards, ...defense];
    const playerById = Object.fromEntries(players.map((player) => [player.id, player]));
    const goalie = goalies.find((player) => player.starter) || goalies[0] || null;
    const backup = goalies.find((player) => goalie && player.id !== goalie.id) || goalies[1] || null;
    return { ...team, isHome, forwards, defense, goalies, players, playerById, goalie, backup, starterId: goalie?.id || null };
  }

  function applyHistoricalReplayLock() {
    for (const control of [
      elements.homeTeamSelect, elements.awayTeamSelect, elements.homeJerseySelect, elements.awayJerseySelect,
      elements.seedInput, elements.recentGamesSelect, elements.newGameButton, elements.officialExportButton,
    ]) {
      if (control) control.disabled = true;
    }
    if (elements.officialExportButton) elements.officialExportButton.textContent = `Game ${historicalReplayGameId} Locked`;
    if (elements.officialStatus) {
      elements.officialStatus.textContent = `Official Replay · Game ${historicalReplayGameId}`;
      elements.officialStatus.classList.add("verified");
    }
    if (elements.assetStatus) {
      elements.assetStatus.dataset.ready = "true";
      elements.assetStatus.textContent = `Locked official replay · ${historicalReplayMetadata?.simulatorVersion || SIMULATOR_VERSION} · Seed ${game?.seed ?? "—"}`;
    }
    setStatus("Replay", "ready");
  }

  function resetHistoricalReplayPlayback() {
    if (!isHistoricalReplay) return;
    stopPlayback();
    cancelReplay();
    currentEventIndex = -1;
    encounteredGoals = [];
    currentReplayEventId = null;
    resetDisplay();
    applyHistoricalReplayLock();
  }

  async function loadHistoricalReplay(gameId) {
    const response = await fetch(`/api/replay/${encodeURIComponent(gameId)}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `Official Game ${gameId} replay is unavailable.`);
    const snapshot = await decodeReplayArchive(payload.archive);
    if (snapshot?.schema !== "avhl-official-replay-v1" || Number(snapshot.gameId) !== Number(gameId)) throw new Error("The saved replay snapshot is invalid.");
    if (!snapshot?.matchupData?.home || !snapshot?.matchupData?.away || !Array.isArray(snapshot.events) || !snapshot.events.length) throw new Error("The saved replay snapshot is incomplete.");

    isHistoricalReplay = true;
    historicalReplayGameId = Number(gameId);
    historicalReplayMetadata = payload.metadata || {};
    currentGameInput = cloneData(snapshot.matchupData);
    homeId = snapshot.homeId || snapshot.matchupData.home.id;
    awayId = snapshot.awayId || snapshot.matchupData.away.id;
    teams = {
      [homeId]: historicalTeam(snapshot.matchupData.home, true),
      [awayId]: historicalTeam(snapshot.matchupData.away, false),
    };
    events = cloneData(snapshot.events);
    game = {
      seed: snapshot.seed,
      homeId,
      awayId,
      teams,
      events,
      finalSummary: cloneData(snapshot.finalSummary || events.at(-1)?.details || null),
    };
    currentEventIndex = -1;
    encounteredGoals = [];
    currentReplayEventId = null;
    currentGameHistorySaved = true;

    if (elements.homeTeamSelect) elements.homeTeamSelect.value = teams[homeId].abbreviation;
    if (elements.awayTeamSelect) elements.awayTeamSelect.value = teams[awayId].abbreviation;
    if (elements.homeJerseySelect) elements.homeJerseySelect.value = snapshot.jerseySelections?.home || "Home";
    if (elements.awayJerseySelect) elements.awayJerseySelect.value = snapshot.jerseySelections?.away || "Away";
    if (elements.seedInput) elements.seedInput.value = String(snapshot.seed);
    syncTeamSelectorLocks();
    resetDisplay();
    applyHistoricalReplayLock();
  }

  function officialLineupSnapshot(side) {
    const inputTeam = currentGameInput?.[side];
    if (!inputTeam?.abbreviation || !inputTeam?.lineupRecord) return null;
    return {
      abbreviation: inputTeam.abbreviation,
      source: inputTeam.lineupSource || "projected",
      revision: Number(inputTeam.lineupRevision) || 0,
      record: cloneData(inputTeam.lineupRecord),
    };
  }

  function buildOfficialPacket() {
    const summary = game.finalSummary;
    return {
      schema: "avhl-official-game-v3",
      simulatorVersion: SIMULATOR_VERSION,
      simGameId: officialGameId(),
      verifiedAt: new Date().toISOString(),
      seed: game.seed,
      finish: officialFinish(),
      away: { id: awayId, abbreviation: teams[awayId].abbreviation, fullName: teams[awayId].fullName, score: summary.score[awayId] },
      home: { id: homeId, abbreviation: teams[homeId].abbreviation, fullName: teams[homeId].fullName, score: summary.score[homeId] },
      lineups: {
        away: officialLineupSnapshot("away"),
        home: officialLineupSnapshot("home"),
      },
      summary,
    };
  }

  async function officialApi(payload) {
    const response = await fetch("/api/sim-official-game", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.ok) throw new Error(result?.error || "Official game request failed.");
    return result;
  }

  async function submitOfficialGame(event) {
    event.preventDefault();
    if (!game?.finalSummary || currentEventIndex < events.length - 1) return;
    const password = elements.officialPassword.value;
    elements.officialError.textContent = "Verifying Commish password…";
    try {
      const valid = await verifyOfficialPassword(password);
      if (!valid) { elements.officialError.textContent = "Incorrect administrator password."; elements.officialPassword.select(); return; }
      officialPasswordValue = password;
      elements.officialPassword.value = "";
      elements.officialPasswordStep.hidden = true;
      elements.officialGameStep.hidden = false;
      elements.officialError.textContent = "Password verified. Enter the official Game #.";
      requestAnimationFrame(() => elements.officialGameNumber.focus());
    } catch (error) { console.error(error); elements.officialError.textContent = error.message || "Could not verify administrator password."; }
  }

  async function checkOfficialGame() {
    const gameNumber = Number.parseInt(elements.officialGameNumber.value, 10);
    if (!Number.isInteger(gameNumber) || gameNumber < 1 || gameNumber > 1640) { elements.officialError.textContent = "Enter a Game # from 1 to 1640."; return; }
    elements.officialCheckGame.disabled = true; elements.officialSaveGame.disabled = true; elements.officialError.textContent = "Checking the official schedule…";
    try {
      const result = await officialApi({ action: "check", password: officialPasswordValue, gameNumber, awayAbbreviation: teams[awayId].abbreviation, homeAbbreviation: teams[homeId].abbreviation });
      officialCheckedGameNumber = gameNumber;
      elements.officialMatchup.innerHTML = `<strong>Game ${escapeHtml(result.game.id)}</strong> · ${escapeHtml(result.game.awayName)} @ ${escapeHtml(result.game.homeName)}<br><strong>Sim final:</strong> ${escapeHtml(teams[awayId].abbreviation)} ${escapeHtml(game.finalSummary.score[awayId])} – ${escapeHtml(teams[homeId].abbreviation)} ${escapeHtml(game.finalSummary.score[homeId])} · ${escapeHtml(officialFinish())}`;
      elements.officialMatchup.hidden = false; elements.officialSaveGame.disabled = false; elements.officialError.textContent = "Matchup confirmed. Save when ready.";
    } catch (error) { console.error(error); officialCheckedGameNumber = null; elements.officialMatchup.hidden = true; elements.officialError.textContent = error.message || "Could not verify the official Game #."; }
    finally { elements.officialCheckGame.disabled = false; }
  }

  async function saveOfficialGame() {
    if (!officialCheckedGameNumber) { elements.officialError.textContent = "Verify the Game # first."; return; }
    elements.officialSaveGame.disabled = true; elements.officialCheckGame.disabled = true; elements.officialError.textContent = "Locking exact replay + saving official stats…";
    try {
      const packet = buildOfficialPacket();
      const replayArchive = await encodeReplaySnapshot(buildOfficialReplaySnapshot(officialCheckedGameNumber));
      const result = await officialApi({ action: "save", password: officialPasswordValue, gameNumber: officialCheckedGameNumber, packet, replayArchive });
      officialVerifiedGameId = result.game.id;
      closeOfficialModal();
      elements.officialStatus.textContent = `Official · Game ${result.game.id} saved`;
      elements.officialStatus.classList.add("verified");
      elements.officialExportButton.textContent = `Game ${result.game.id} Saved`;
      elements.officialExportButton.disabled = true;
    } catch (error) { console.error(error); elements.officialError.textContent = error.message || "Could not save the official game."; elements.officialSaveGame.disabled = false; }
    finally { elements.officialCheckGame.disabled = false; }
  }

  function summaryLeaderText(homeValue, awayValue) {
    const homeNumber = Number(homeValue) || 0;
    const awayNumber = Number(awayValue) || 0;
    if (homeNumber === awayNumber) return `${homeNumber}–${awayNumber}`;

    const homeLeads = homeNumber > awayNumber;
    const high = homeLeads ? homeNumber : awayNumber;
    const low = homeLeads ? awayNumber : homeNumber;
    const leader = homeLeads ? teams[homeId] : teams[awayId];
    return `${high}–${low} ${leader?.abbreviation || ""}`.trim();
  }

  function injuryPositionLabel(position) {
    const value = String(position || "").toUpperCase();
    if (value === "LD" || value === "RD" || value === "D") return "D";
    if (value === "G") return "G";
    return value || "F";
  }

  function injuryBodyAreaLabel(bodyArea) {
    return String(bodyArea || "Injury").replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }

  function renderFinalSummary(summary) {
    if (!summary) return;
    const injuries = summary.injuries || [];
    elements.summary.innerHTML = `
      <div class="summary-topline">
        <div>
          <span>Final Score</span>
          <strong>${escapeHtml(summaryLeaderText(summary.score[homeId], summary.score[awayId]))}</strong>
        </div>
        <div>
          <span>Shots On Goal</span>
          <strong>${escapeHtml(summaryLeaderText(summary.shots[homeId], summary.shots[awayId]))}</strong>
        </div>
        <div>
          <span>Shot Attempts</span>
          <strong>${escapeHtml(summaryLeaderText(summary.attempts[homeId], summary.attempts[awayId]))}</strong>
        </div>
      </div>
      <div class="injury-summary-block">
        <div class="injury-summary-heading">Injuries</div>
        ${injuries.length ? `
          <div class="injury-summary-list">
            ${injuries.map((injury) => {
              const team = teams[injury.teamId];
              const teamAbbreviation = team?.abbreviation || "—";
              return `
                <div class="injury-summary-row">
                  <span>${escapeHtml(injuryPositionLabel(injury.position))} ${escapeHtml(injury.playerName)} (${escapeHtml(teamAbbreviation)}) · ${escapeHtml(injuryBodyAreaLabel(injury.bodyArea))}</span>
                  <strong>${escapeHtml(injuryGamesText(injury.gamesMissed, { prefix: true }))}</strong>
                </div>
              `;
            }).join("")}
          </div>
        ` : `<div class="injury-summary-none">No injuries</div>`}
      </div>
    `;
  }

  window.addEventListener("resize", () => window.requestAnimationFrame(() => {
    fitBroadcastTeamNames();
    fitLiveStatTeamNames();
  }));

  elements.playButton.addEventListener("click", async () => {
    if (playing) {
      stopPlayback();
      return;
    }
    if (isHistoricalReplay) {
      if (currentEventIndex >= events.length - 1 && events.length) resetHistoricalReplayPlayback();
      startPlayback();
      return;
    }
    if (currentEventIndex >= events.length - 1 && events.length) {
      const [refreshed] = await Promise.all([
        refreshLiveRosterState({ quiet: true }),
        refreshOfficialScoringStats({ quiet: true }),
      ]);
      if (!refreshed) {
        setStatus("Latest lineup unavailable", "error");
        return;
      }
      if (!createNewGame({ freshSeed: true })) return;
    } else if (currentEventIndex < 0) {
      const existingSeed = Number(elements.seedInput.value);
      const [refreshed] = await Promise.all([
        refreshLiveRosterState({ quiet: true }),
        refreshOfficialScoringStats({ quiet: true }),
      ]);
      if (!refreshed) {
        setStatus("Latest lineup unavailable", "error");
        return;
      }
      if (!createNewGame({ freshSeed: false, seedOverride: existingSeed })) return;
    }
    startPlayback();
  });

  async function refreshBeforeFirstAdvance() {
    if (isHistoricalReplay) return true;
    if (currentEventIndex >= 0) return true;
    const existingSeed = Number(elements.seedInput.value);
    const [refreshed] = await Promise.all([
      refreshLiveRosterState({ quiet: true }),
      refreshOfficialScoringStats({ quiet: true }),
    ]);
    if (!refreshed) {
      setStatus("Latest lineup unavailable", "error");
      return false;
    }
    return createNewGame({ freshSeed: false, seedOverride: existingSeed });
  }

  elements.nextGoalButton.addEventListener("click", async () => {
    if (!await refreshBeforeFirstAdvance()) return;
    jumpUntil((event) => event.type === "goal" || event.type === "final");
  });

  elements.periodButton.addEventListener("click", async () => {
    if (!await refreshBeforeFirstAdvance()) return;
    const currentPeriod = currentEventIndex < 0 ? 1 : events[currentEventIndex].period;
    jumpUntil((event) =>
      event.type === "period-end" && String(event.period) === String(currentPeriod)
    );
  });

  elements.endButton.addEventListener("click", async () => {
    if (!await refreshBeforeFirstAdvance()) return;
    jumpUntil((event) => event.type === "final");
  });

  elements.homeTeamSelect?.addEventListener("change", handleHomeTeamChange);
  elements.awayTeamSelect?.addEventListener("change", handleAwayTeamChange);
  elements.homeJerseySelect?.addEventListener("change", () => handleJerseyChange("home"));
  elements.awayJerseySelect?.addEventListener("change", () => handleJerseyChange("away"));

  elements.newGameButton.addEventListener("click", async () => {
    if (isHistoricalReplay) return;
    const refreshed = await refreshLiveRosterState({ quiet: false });
    if (!refreshed) {
      setStatus("Latest lineup unavailable", "error");
      return;
    }
    createNewGame({ freshSeed: true });
  });

  elements.goalSelect.addEventListener("change", () => {
    const eventId = Number(elements.goalSelect.value);
    const event = encounteredGoals.find((goal) => goal.id === eventId);
    if (event) loadGoalReplay(event);
  });

  elements.replayButton.addEventListener("click", toggleGoalReplay);

  elements.replayProgress.addEventListener("input", () => {
    if (!currentReplayEvent?.replay) return;
    pauseGoalReplay();
    renderReplayFrame(Number(elements.replayProgress.value));
  });

  elements.periodFilter.addEventListener("change", renderEventMap);
  document.querySelectorAll("[data-map-type]").forEach((checkbox) => {
    checkbox.addEventListener("change", renderEventMap);
  });

  elements.seedInput.addEventListener("keydown", async (event) => {
    if (isHistoricalReplay || event.key !== "Enter") return;
    const refreshed = await refreshLiveRosterState({ quiet: true });
    if (!refreshed) {
      setStatus("Latest lineup unavailable", "error");
      return;
    }
    createNewGame({ freshSeed: false });
  });

  elements.recentGamesSelect?.addEventListener("change", async () => {
    if (isHistoricalReplay) return;
    if (elements.recentGamesSelect.value) await restoreRecentGame(elements.recentGamesSelect.value);
  });

  elements.boxScoreTabs.forEach((button) => {
    button.addEventListener("click", () => selectBoxScoreTab(button.dataset.boxTab));
  });
  elements.boxScoreContent?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-box-sort-key]");
    if (!button) return;
    const tabName = button.dataset.boxSortTab || activeBoxTab;
    const key = button.dataset.boxSortKey;
    const type = button.dataset.boxSortType || "number";
    const current = boxScoreSortByTab[tabName];
    boxScoreSortByTab[tabName] = {
      key,
      direction: current?.key === key ? (current.direction === "asc" ? "desc" : "asc") : (type === "text" ? "asc" : "desc"),
    };
    renderFullBoxScore(game?.finalSummary);
  });
  elements.officialExportButton?.addEventListener("click", openOfficialModal);
  elements.officialForm?.addEventListener("submit", submitOfficialGame);
  elements.officialCheckGame?.addEventListener("click", checkOfficialGame);
  elements.officialSaveGame?.addEventListener("click", saveOfficialGame);
  elements.officialGameNumber?.addEventListener("input", () => { officialCheckedGameNumber = null; elements.officialSaveGame.disabled = true; elements.officialMatchup.hidden = true; });
  elements.officialCloseButtons.forEach((button) => button.addEventListener("click", closeOfficialModal));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.officialModal?.hidden) closeOfficialModal();
  });

  window.AVHL_RINK_GEOMETRY.initializeSvg(elements.replayRink);
  window.AVHL_RINK_GEOMETRY.initializeSvg(elements.eventRink);
  window.__AVHL_DEBUG__ = {
    get game() { return game; },
    get events() { return events; },
    get currentReplayEvent() { return currentReplayEvent; },
    renderReplayFrame,
    loadGoalReplay
  };
  initializeLeagueBranding();
  if (window.AVHL_LOAD_LIVE_BRANDING) {
    try {
      const brandingStatus = await window.AVHL_LOAD_LIVE_BRANDING();
      console.info(`AVHL simulator branding: ${brandingStatus.liveTeamCount} live teams (${brandingStatus.source})`);
    } catch (error) {
      console.warn("Live AVHL team branding unavailable; using bundled team branding.", error);
    }
  }
  populateTeamSelectors();
  loadRecentGames();
  renderRecentGames();

  const replayGameId = new URLSearchParams(window.location.search).get("replay");
  if (replayGameId) {
    try {
      if (elements.assetStatus) elements.assetStatus.textContent = `Loading locked official Game ${replayGameId}…`;
      await refreshOfficialScoringStats({ beforeGameId: replayGameId, quiet: true });
      await loadHistoricalReplay(replayGameId);
    } catch (error) {
      console.error(error);
      setStatus("Replay unavailable", "error");
      if (elements.assetStatus) {
        elements.assetStatus.dataset.ready = "false";
        elements.assetStatus.textContent = "Official replay unavailable";
      }
      if (elements.feed) elements.feed.innerHTML = `<div class="feed-error">${escapeHtml(error.message || "Unable to load this official replay.")}</div>`;
      for (const control of [elements.playButton, elements.nextGoalButton, elements.periodButton, elements.endButton]) {
        if (control) control.disabled = true;
      }
    }
  } else {
    const [initialRosterRefresh] = await Promise.all([
      refreshLiveRosterState({ quiet: false }),
      refreshOfficialScoringStats({ quiet: true }),
    ]);

    if (initialRosterRefresh) {
      createNewGame({ freshSeed: true });
    } else {
      setStatus("Latest lineup unavailable", "error");
      if (elements.feed) {
        elements.feed.innerHTML = `<div class="feed-error">Latest owner lineup data could not be verified. Retry with New Game before starting.</div>`;
      }
    }
  }
})();
