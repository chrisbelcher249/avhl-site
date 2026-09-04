(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SIMULATOR_VERSION = "V5.2";
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
  let officialVerifiedGameId = null;

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
      id: `${SIMULATOR_VERSION}|${away.abbreviation}|${home.abbreviation}|${game.seed}`,
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

  function restoreRecentGame(entryId) {
    const entry = recentGames.find((item) => item.id === entryId);
    if (!entry) return;
    if (elements.homeTeamSelect) elements.homeTeamSelect.value = entry.homeCode;
    if (elements.awayTeamSelect) elements.awayTeamSelect.value = entry.awayCode;
    resetJerseyDefault("home");
    resetJerseyDefault("away");
    syncTeamSelectorLocks();
    if (elements.seedInput) elements.seedInput.value = String(entry.seed);
    createNewGame({ freshSeed: false, seedOverride: entry.seed });
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
    if (elements.arenaName) elements.arenaName.textContent = home.arenaName || "AVHL Arena";
    document.querySelectorAll("[data-home-arena-name]").forEach((node) => {
      node.textContent = home.arenaName || "AVHL Arena";
    });
    if (elements.matchupLabel) elements.matchupLabel.textContent = `${away.abbreviation} at ${home.abbreviation}`;

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


  async function loadLiveRosters() {
    try {
      const response = await fetch("/api/sim-rosters", { cache: "no-store" });
      if (!response.ok) throw new Error(`Live roster endpoint returned ${response.status}`);
      const payload = await response.json();
      window.AVHL_SET_LIVE_ROSTERS?.(payload.rosters ?? {});
      console.info(`[AVHL Simulator] Live rosters loaded (${payload.source || "unknown source"}).`);
      return true;
    } catch (error) {
      console.error("[AVHL Simulator] Unable to load live rosters; demo rosters remain available.", error);
      return false;
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

  function handleHomeTeamChange() {
    resetJerseyDefault("home");
    syncTeamSelectorLocks();
    createNewGame();
  }

  function handleAwayTeamChange() {
    resetJerseyDefault("away");
    syncTeamSelectorLocks();
    createNewGame();
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
    if (currentEventIndex >= events.length - 1) createNewGame();
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
    elements.seedInput.value = String(seed);

    try {
      const simulator = new window.AVHLGameSimulator(selectedMatchupData(), seed);
      game = simulator.simulateGame();
      events = game.events;
      teams = game.teams;
      homeId = game.homeId;
      awayId = game.awayId;
      currentEventIndex = -1;
      encounteredGoals = [];
      currentReplayEventId = null;
      currentGameHistorySaved = false;
      resetDisplay();
    } catch (error) {
      console.error(error);
      elements.feed.innerHTML = `<div class="feed-error">Simulator error: ${escapeHtml(error.message)}</div>`;
      setStatus("Error", "error");
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
    elements.statsHomeName.textContent = home.name;
    elements.statsAwayName.textContent = away.name;
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
      elements.officialExportButton.disabled = false;
      elements.officialStatus.textContent = "Final · sandbox game";
      saveCurrentGameToHistory(event);
      stopPlayback();
    }

    if (updateMap && event.mapType) scheduleMapRender();
  }

  function feedEventClass(event) {
    if (event.type === "goal") return "goal";
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
        event.type === "period-start" ||
        event.type === "period-end" ||
        event.type === "shootout-attempt" ||
        event.type === "final";
      renderEvent(event, { appendFeed, updateMap: false });
    }
    renderEventMap();
  }

  function registerGoal(event) {
    if (!encounteredGoals.some((goal) => goal.id === event.id)) {
      encounteredGoals.push(event);
      const scorer = getPlayer(event.playerId);
      const option = document.createElement("option");
      option.value = String(event.id);
      option.textContent = `${event.periodLabel} ${event.clockText} — ${shortName(scorer)}`;
      elements.goalSelect.append(option);
    }
    elements.goalSelect.disabled = false;
    elements.replayButton.disabled = false;
    elements.replayProgress.disabled = false;
    elements.goalSelect.value = String(event.id);
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

      // V5.2 intentionally draws no scorer/assist trajectory trails.

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

  function resetFullBoxScore() {
    activeBoxTab = "team";
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
    if (team?.assets?.logo) {
      return `<img class="boxscore-team-logo" src="${escapeHtml(team.assets.logo)}" alt="${escapeHtml(team.fullName || team.name)} logo" onerror="this.hidden=true;this.nextElementSibling.hidden=false" /><span class="boxscore-team-logo-fallback" hidden>${escapeHtml(team.abbreviation)}</span>`;
    }
    return `<span class="boxscore-team-logo-fallback">${escapeHtml(team?.abbreviation || "AVHL")}</span>`;
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
      ["SHORTHANDED GOALS", teamStatValue(summary, awayId, "shorthandedGoals"), teamStatValue(summary, homeId, "shorthandedGoals")]
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

  function renderSkaterTable(summary, teamId) {
    const team = teams[teamId];
    const rows = summary?.skaters?.[teamId] || [];
    elements.boxScoreContent.innerHTML = `
      <div class="stat-table-heading">
        <div>${teamLogoMarkup(team)}<div><span>${escapeHtml(team.abbreviation)}</span><strong>${escapeHtml(team.fullName || team.name)} Skaters</strong></div></div>
        <span>${rows.length} skaters dressed</span>
      </div>
      <div class="stat-table-scroll">
        <table class="official-stat-table skater-stat-table">
          <thead><tr>
            <th>Player</th><th>Min</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th><th>S</th><th>S%</th><th>PPT</th><th>PIM</th><th>Hits</th><th>PPG</th><th>SHG</th><th>FOT</th><th>FOW</th><th>FO%</th>
          </tr></thead>
          <tbody>
            ${rows.map((row) => {
              const fot = (row.faceoffWins || 0) + (row.faceoffLosses || 0);
              return `<tr>
                <td class="player-name-cell"><strong>${escapeHtml(row.name)}</strong><span>#${escapeHtml(row.number)} · ${escapeHtml(row.position)}</span></td>
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
    const rows = summary?.goalieRows?.[teamId] || [];
    elements.boxScoreContent.innerHTML = `
      <div class="stat-table-heading">
        <div>${teamLogoMarkup(team)}<div><span>${escapeHtml(team.abbreviation)}</span><strong>${escapeHtml(team.fullName || team.name)} Goalies</strong></div></div>
        <span>Starter + backup</span>
      </div>
      <div class="stat-table-scroll">
        <table class="official-stat-table goalie-stat-table">
          <thead><tr>
            <th>Player</th><th>Min</th><th>SA</th><th>S</th><th>SV%</th><th>GA</th><th>GAA</th><th>ENG</th><th>PIM</th><th>G</th><th>A</th><th>PTS</th>
          </tr></thead>
          <tbody>
            ${rows.map((row) => `<tr>
              <td class="player-name-cell"><strong>${escapeHtml(row.name)}</strong><span>#${escapeHtml(row.number)}${row.starter ? " · Starter" : " · Backup"}</span></td>
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

  function officialGameId() {
    if (!game || !teams) return "";
    return `${SIMULATOR_VERSION}|${teams[awayId].abbreviation}|${teams[homeId].abbreviation}|${game.seed}`;
  }

  function openOfficialModal() {
    if (!game?.finalSummary || currentEventIndex < events.length - 1) return;
    elements.officialError.textContent = "";
    elements.officialPassword.value = "";
    elements.officialModal.hidden = false;
    requestAnimationFrame(() => elements.officialPassword.focus());
  }

  function closeOfficialModal() {
    if (!elements.officialModal) return;
    elements.officialModal.hidden = true;
    if (elements.officialPassword) elements.officialPassword.value = "";
    if (elements.officialError) elements.officialError.textContent = "";
  }

  function bytesToHex(bytes) {
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function verifyOfficialPassword(password) {
    const config = window.AVHL_OFFICIAL_CONFIG;
    if (!config?.salt || !config?.passwordHash) throw new Error("Administrator password is not configured.");
    if (!window.crypto?.subtle) throw new Error("Secure password verification is unavailable in this browser.");
    const input = new TextEncoder().encode(`${config.salt}:${password}`);
    const digest = await window.crypto.subtle.digest(config.algorithm || "SHA-256", input);
    return bytesToHex(new Uint8Array(digest)).toLowerCase() === String(config.passwordHash).toLowerCase();
  }

  function cleanEventForOfficialPacket(event) {
    return {
      id: event.id,
      type: event.type,
      period: event.period,
      periodLabel: event.periodLabel,
      clock: event.clock,
      clockText: event.clockText,
      absoluteTime: event.absoluteTime,
      strength: event.strength,
      text: event.text,
      teamId: event.teamId,
      playerId: event.playerId,
      secondaryPlayerId: event.secondaryPlayerId,
      location: event.location,
      mapType: event.mapType,
      outcome: event.outcome,
      details: event.details || null,
      score: event.score
    };
  }

  function buildOfficialPacket() {
    const summary = game.finalSummary;
    return {
      schema: "avhl-official-game-v1",
      simulatorVersion: SIMULATOR_VERSION,
      gameId: officialGameId(),
      verifiedAt: new Date().toISOString(),
      seed: game.seed,
      away: {
        id: awayId,
        abbreviation: teams[awayId].abbreviation,
        fullName: teams[awayId].fullName,
        score: summary.score[awayId]
      },
      home: {
        id: homeId,
        abbreviation: teams[homeId].abbreviation,
        fullName: teams[homeId].fullName,
        score: summary.score[homeId]
      },
      summary,
      events: events.map(cleanEventForOfficialPacket)
    };
  }

  function downloadOfficialPacket(packet) {
    const json = JSON.stringify(packet, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AVHL_Official_${packet.away.abbreviation}_at_${packet.home.abbreviation}_${packet.seed}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function submitOfficialGame(event) {
    event.preventDefault();
    if (!game?.finalSummary || currentEventIndex < events.length - 1) return;
    const password = elements.officialPassword.value;
    elements.officialError.textContent = "Verifying…";
    try {
      const valid = await verifyOfficialPassword(password);
      if (!valid) {
        elements.officialError.textContent = "Incorrect administrator password.";
        elements.officialPassword.select();
        return;
      }
      const packet = buildOfficialPacket();
      officialVerifiedGameId = packet.gameId;
      downloadOfficialPacket(packet);
      closeOfficialModal();
      elements.officialStatus.textContent = "Verified locally · packet saved";
      elements.officialStatus.classList.add("verified");
      elements.officialExportButton.textContent = "Save Official Packet Again";
    } catch (error) {
      console.error(error);
      elements.officialError.textContent = error.message || "Could not verify administrator password.";
    }
  }

  function goalieSavePercentage(stats) {
    if (!stats?.shotsAgainst) return "—";
    return (stats.saves / stats.shotsAgainst).toFixed(3).replace(/^0/, "");
  }

  function renderFinalSummary(summary) {
    if (!summary) return;
    const homeGoalie = teams[homeId].goalie;
    const awayGoalie = teams[awayId].goalie;
    elements.summary.innerHTML = `
      <div class="summary-topline">
        <div>
          <span>Final</span>
          <strong>${summary.score[homeId]}–${summary.score[awayId]}</strong>
        </div>
        <div>
          <span>Shots</span>
          <strong>${summary.shots[homeId]}–${summary.shots[awayId]}</strong>
        </div>
        <div>
          <span>Attempts</span>
          <strong>${summary.attempts[homeId]}–${summary.attempts[awayId]}</strong>
        </div>
      </div>
      <div class="goalie-lines">
        <div><span>${escapeHtml(shortName(homeGoalie))}</span><strong>${summary.goalies[homeId].saves}/${summary.goalies[homeId].shotsAgainst} · ${goalieSavePercentage(summary.goalies[homeId])}</strong></div>
        <div><span>${escapeHtml(shortName(awayGoalie))}</span><strong>${summary.goalies[awayId].saves}/${summary.goalies[awayId].shotsAgainst} · ${goalieSavePercentage(summary.goalies[awayId])}</strong></div>
      </div>
      <div class="leader-list">
        ${summary.leaders.length
          ? summary.leaders.map((leader) => `
              <div class="leader-row">
                <span>${escapeHtml(leader.name)}</span>
                <strong>${leader.goals}G ${leader.assists}A</strong>
              </div>
            `).join("")
          : `<p>No skater recorded a point.</p>`}
      </div>
    `;
  }

  elements.playButton.addEventListener("click", () => {
    if (playing) stopPlayback();
    else startPlayback();
  });

  elements.nextGoalButton.addEventListener("click", () => {
    jumpUntil((event) => event.type === "goal" || event.type === "final");
  });

  elements.periodButton.addEventListener("click", () => {
    const currentPeriod = currentEventIndex < 0 ? 1 : events[currentEventIndex].period;
    jumpUntil((event) =>
      event.type === "period-end" && String(event.period) === String(currentPeriod)
    );
  });

  elements.endButton.addEventListener("click", () => {
    jumpUntil((event) => event.type === "final");
  });

  elements.homeTeamSelect?.addEventListener("change", handleHomeTeamChange);
  elements.awayTeamSelect?.addEventListener("change", handleAwayTeamChange);
  elements.homeJerseySelect?.addEventListener("change", () => handleJerseyChange("home"));
  elements.awayJerseySelect?.addEventListener("change", () => handleJerseyChange("away"));

  elements.newGameButton.addEventListener("click", () => createNewGame({ freshSeed: true }));

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

  elements.seedInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") createNewGame({ freshSeed: false });
  });

  elements.recentGamesSelect?.addEventListener("change", () => {
    if (elements.recentGamesSelect.value) restoreRecentGame(elements.recentGamesSelect.value);
  });

  elements.boxScoreTabs.forEach((button) => {
    button.addEventListener("click", () => selectBoxScoreTab(button.dataset.boxTab));
  });
  elements.officialExportButton?.addEventListener("click", openOfficialModal);
  elements.officialForm?.addEventListener("submit", submitOfficialGame);
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
  async function bootstrapSimulator() {
    initializeLeagueBranding();
    populateTeamSelectors();
    loadRecentGames();
    renderRecentGames();
    await loadLiveRosters();
    createNewGame({ freshSeed: true });
  }

  bootstrapSimulator();
})();
