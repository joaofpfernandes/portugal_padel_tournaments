(async () => {
  /* ── DOM refs ── */
  const sourceSelect = document.getElementById("profileSource");
  const searchInput = document.getElementById("profileSearch");
  const resultsList = document.getElementById("profileResults");
  const infoSection = document.getElementById("profileInfo");
  const levelsSection = document.getElementById("profileLevels");
  const levelsBody = document.getElementById("profileLevelsBody");
  const clearBtn = document.getElementById("profileClear");
  const shareBtn = document.getElementById("profileShare");

  const pairSection = document.getElementById("pairSection");
  const pairSearch = document.getElementById("pairSearch");
  const pairResults = document.getElementById("pairResults");
  const pairInfo = document.getElementById("pairInfo");
  const pairClearBtn = document.getElementById("pairClear");
  const pairSummary = document.getElementById("pairSummary");

  /* ── Constants ── */
  const STORAGE_KEY = "padel-profile-v1";
  const MAX_RESULTS = 50;
  const CDN_BASE = "https://cdn.jsdelivr.net/gh/ricardowth/portugal_padel_cdn@main/rankings";
  const RANKINGS_CACHE_TTL_MS = 60 * 60 * 1000;

  /* ── Rankings data store ── */
  const rankingsStore = { male: [], female: [] };

  /* ── Helpers ── */
  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const normalizeSearch = (value) =>
    String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const parsePoints = (value) => {
    const cleaned = String(value ?? "")
      .replace(/\./g, "")
      .replace(",", ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  const formatPoints = (value) => {
    const rounded = Math.round(value * 100) / 100;
    const parts = rounded.toFixed(2).split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${integerPart},${parts[1]}`;
  };

  const extractLevelNumber = (levelStr) => {
    const match = String(levelStr ?? "").match(/(\d+)/);
    return match ? Number(match[1]) : 6;
  };

  /* ── Data access ── */
  const fetchRankingsForSource = async (source) => {
    const cacheKey = `${source}-rankings-cache-v1`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.data) && Date.now() - Number(parsed.timestamp || 0) <= RANKINGS_CACHE_TTL_MS) {
          return parsed.data;
        }
      }
    } catch { /* ignore */ }

    const response = await fetch(`${CDN_BASE}/${source}/latest.json`, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const data = Array.isArray(json?.rankings) ? json.rankings : [];

    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        date: String(json?.date || ""),
        timestamp: Date.now(),
        data,
      }));
    } catch { /* quota exceeded */ }

    return data;
  };

  const loadAllRankings = async () => {
    const [male, female] = await Promise.all([
      fetchRankingsForSource("male").catch(() => []),
      fetchRankingsForSource("female").catch(() => []),
    ]);
    rankingsStore.male = male;
    rankingsStore.female = female;
  };

  const getRankings = (source) => {
    return source === "female" ? rankingsStore.female : rankingsStore.male;
  };

  const getThresholds = (source) => {
    const positions =
      source === "female"
        ? window.FEMALE_LEVEL_POSITIONS
        : window.MALE_LEVEL_POSITIONS;
    const rankings = getRankings(source);

    // Sort by ranking position ascending so index matches position
    const sorted = [...rankings].sort(
      (a, b) =>
        (Number(a.Ranking) || Number.MAX_SAFE_INTEGER) -
        (Number(b.Ranking) || Number.MAX_SAFE_INTEGER),
    );

    return positions.map((pos) => {
      let minPoints = 0;
      if (pos.maxPosition != null && sorted.length > 0) {
        // The player at the cutoff position (1-based) sets the threshold
        const idx = Math.min(pos.maxPosition, sorted.length) - 1;
        minPoints = parsePoints(sorted[idx]?.Points);
      }
      return { level: pos.level, label: pos.label, minPoints };
    });
  };

  /* ── Persistence ── */
  const loadSaved = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const saveCurrent = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* quota exceeded – ignore */
    }
  };

  const clearSaved = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  /* ── Search ── */
  const searchPlayers = (query, source, excludeId) => {
    if (!query || query.length < 2) return [];
    const rankings = getRankings(source);
    const terms = query
      .split(",")
      .map((t) => normalizeSearch(t.trim()))
      .filter(Boolean);
    if (!terms.length) return [];

    const matches = [];
    for (const player of rankings) {
      if (excludeId && player.PlayerID === excludeId) continue;
      const name = normalizeSearch(player.Name);
      const licence = normalizeSearch(player.LicenceNumber);
      const club = normalizeSearch(player.Club);
      const match = terms.some(
        (t) => name.includes(t) || licence.includes(t) || club.includes(t),
      );
      if (match) {
        matches.push(player);
        if (matches.length >= MAX_RESULTS) break;
      }
    }
    return matches;
  };

  /* ── Render helpers ── */
  const renderResultsList = (players, listEl, onSelect) => {
    if (!players.length) {
      listEl.innerHTML =
        '<li class="profile-result-item profile-no-result">Nenhum resultado encontrado</li>';
      listEl.hidden = false;
      return;
    }
    listEl.innerHTML = players
      .map(
        (p) =>
          `<li class="profile-result-item" data-id="${escapeHtml(p.PlayerID)}">`+
          `<span class="profile-result-name">${escapeHtml(p.Name)}</span>`+
          `<span class="profile-result-meta">${escapeHtml(p.LicenceNumber)}${p.Club ? " · " + escapeHtml(p.Club) : ""}</span>`+
          `</li>`,
      )
      .join("");
    listEl.hidden = false;

    listEl.querySelectorAll("[data-id]").forEach((li) => {
      li.addEventListener("click", () => {
        const id = li.dataset.id;
        const player = players.find((p) => p.PlayerID === id);
        if (player) onSelect(player);
      });
    });
  };

  const hideResults = (listEl) => {
    listEl.innerHTML = "";
    listEl.hidden = true;
  };

  const setShareVisible = (isVisible) => {
    if (!shareBtn) return;
    shareBtn.hidden = !isVisible;
  };

  const updateQueryFromSelection = () => {
    if (!selectedPlayer) return;
    const licence = String(selectedPlayer.LicenceNumber || "").trim();
    if (!licence) return;

    const url = new URL(window.location.href);
    url.searchParams.set("licenceid", licence);
    url.searchParams.set("source", currentSource);
    window.history.replaceState({}, "", url.toString());
  };

  const clearQuerySelection = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("licenceid");
    url.searchParams.delete("source");
    window.history.replaceState({}, "", url.toString());
  };

  const buildShareUrl = () => {
    if (!selectedPlayer) return "";
    const licence = String(selectedPlayer.LicenceNumber || "").trim();
    if (!licence) return "";

    const url = new URL(window.location.href);
    url.searchParams.set("licenceid", licence);
    url.searchParams.set("source", currentSource);
    return url.toString();
  };

  const pulseShareState = (titleText) => {
    if (!shareBtn) return;
    const originalTitle = shareBtn.title;
    shareBtn.classList.add("copied");
    shareBtn.title = titleText;

    window.setTimeout(() => {
      shareBtn.classList.remove("copied");
      shareBtn.title = originalTitle;
    }, 1400);
  };

  const handleShare = async () => {
    const shareUrl = buildShareUrl();
    if (!shareUrl) return;

    const shareData = {
      title: "Perfil do Jogador - Padel Portugal",
      text: `Vê este perfil: ${selectedPlayer?.Name || "Jogador"}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User may cancel native share sheet.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      pulseShareState("Link copiado");
    } catch {
      window.prompt("Copia este link:", shareUrl);
    }
  };

  /* ── Level table ── */
  const renderLevelsTable = (playerPoints, source) => {
    const thresholds = getThresholds(source);
    levelsBody.innerHTML = thresholds
      .map((t) => {
        const diff = t.minPoints - playerPoints;
        const isCurrentOrAbove = playerPoints >= t.minPoints;
        const diffText =
          diff <= 0
            ? '<span class="profile-level-reached">✓ Alcançado</span>'
            : `<span class="profile-level-needed">${formatPoints(diff)} pts</span>`;
        return (
          `<tr class="${isCurrentOrAbove ? "profile-level-row-reached" : ""}">`+
          `<td>${escapeHtml(t.label)}</td>`+
          `<td>${formatPoints(t.minPoints)}</td>`+
          `<td>${diffText}</td>`+
          `</tr>`
        );
      })
      .join("");
    levelsSection.hidden = false;
  };

  /* ── Player info display ── */
  const showPlayerInfo = (player, prefix) => {
    document.getElementById(`${prefix}Name`).textContent = player.Name || "-";
    document.getElementById(`${prefix}Licence`).textContent =
      player.LicenceNumber || "-";
    document.getElementById(`${prefix}Club`).textContent = player.Club || "-";
    document.getElementById(`${prefix}Points`).textContent =
      player.Points || "-";
    document.getElementById(`${prefix}Level`).textContent =
      player.Level || "-";
  };

  /* ── Playable levels logic ── */
  const computePlayableLevels = (player1, player2, source) => {
    const lvl1 = extractLevelNumber(player1.Level);
    const lvl2 = extractLevelNumber(player2.Level);
    const higherLevel = Math.min(lvl1, lvl2); // lower number = higher level
    const lowerLevel = Math.max(lvl1, lvl2);
    const gap = lowerLevel - higherLevel;

    const thresholds = getThresholds(source);
    const allLevels = thresholds.map((t) => t.level);
    const playable = [];

    if (gap > 3) {
      // Gap too large – cannot play together
      return { playable: [], reason: "gap" };
    }

    if (lvl1 === lvl2) {
      // Same level: can play their level or one above (level - 1)
      playable.push(lvl1);
      if (lvl1 > 1 && allLevels.includes(lvl1 - 1)) {
        playable.push(lvl1 - 1);
      }
    } else {
      // Different levels: can play at the higher level (lower number)
      playable.push(higherLevel);
    }

    // Sort ascending (highest level first = lowest number)
    playable.sort((a, b) => a - b);

    return { playable, reason: null };
  };

  const renderPlayableLevels = (player1, player2, source) => {
    const totalPoints =
      parsePoints(player1.Points) + parsePoints(player2.Points);
    document.getElementById("pairTotalPoints").textContent =
      formatPoints(totalPoints);

    const container = document.getElementById("pairPlayableLevels");
    const { playable, reason } = computePlayableLevels(
      player1,
      player2,
      source,
    );

    if (reason === "gap") {
      container.innerHTML =
        '<div class="profile-playable-none">Não podem jogar juntos — diferença de nível superior a 3.</div>';
    } else if (!playable.length) {
      container.innerHTML =
        '<div class="profile-playable-none">Sem níveis disponíveis.</div>';
    } else {
      container.innerHTML = playable
        .map((lvl) => {
          return `<span class="profile-playable-badge">Nível ${lvl}</span>`;
        })
        .join("");
    }

    pairSummary.hidden = false;
  };

  /* ── State ── */
  let currentSource = "male";
  let selectedPlayer = null;
  let selectedPair = null;

  /* ── Main player selection ── */
  const selectPlayer = (player, options = {}) => {
    const shouldSyncUrl = options.syncUrl !== false;

    selectedPlayer = player;
    selectedPair = null;

    showPlayerInfo(player, "profile");
    infoSection.hidden = false;
    searchInput.value = "";
    hideResults(resultsList);
    searchInput.closest(".profile-search-wrapper").hidden = true;

    const pts = parsePoints(player.Points);
    renderLevelsTable(pts, currentSource);

    // Show pair section
    pairSection.hidden = false;
    pairInfo.hidden = true;
    pairSummary.hidden = true;
    pairSearch.value = "";
    hideResults(pairResults);
    pairSearch.closest(".profile-search-wrapper").hidden = false;

    // Lock source selector
    sourceSelect.disabled = true;

    setShareVisible(true);

    if (shouldSyncUrl) {
      updateQueryFromSelection();
    }

    // Save
    saveCurrent({
      source: currentSource,
      playerId: player.PlayerID,
    });
  };

  const clearPlayer = (options = {}) => {
    const shouldSyncUrl = options.syncUrl !== false;

    selectedPlayer = null;
    selectedPair = null;
    infoSection.hidden = true;
    levelsSection.hidden = true;
    pairSection.hidden = true;
    pairInfo.hidden = true;
    pairSummary.hidden = true;
    searchInput.value = "";
    searchInput.closest(".profile-search-wrapper").hidden = false;
    sourceSelect.disabled = false;
    setShareVisible(false);

    if (shouldSyncUrl) {
      clearQuerySelection();
    }

    clearSaved();
  };

  /* ── Pair selection ── */
  const selectPair = (player) => {
    selectedPair = player;
    showPlayerInfo(player, "pair");
    pairInfo.hidden = false;
    pairSearch.value = "";
    hideResults(pairResults);
    pairSearch.closest(".profile-search-wrapper").hidden = true;

    if (selectedPlayer) {
      renderPlayableLevels(selectedPlayer, player, currentSource);
    }
  };

  const clearPair = () => {
    selectedPair = null;
    pairInfo.hidden = true;
    pairSummary.hidden = true;
    pairSearch.value = "";
    pairSearch.closest(".profile-search-wrapper").hidden = false;
  };

  /* ── Event listeners ── */
  let searchDebounce = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      const query = searchInput.value.trim();
      if (query.length < 2) {
        hideResults(resultsList);
        return;
      }
      const players = searchPlayers(query, currentSource);
      renderResultsList(players, resultsList, selectPlayer);
    }, 150);
  });

  let pairDebounce = null;
  pairSearch.addEventListener("input", () => {
    clearTimeout(pairDebounce);
    pairDebounce = setTimeout(() => {
      const query = pairSearch.value.trim();
      if (query.length < 2) {
        hideResults(pairResults);
        return;
      }
      const excludeId = selectedPlayer ? selectedPlayer.PlayerID : null;
      const players = searchPlayers(query, currentSource, excludeId);
      renderResultsList(players, pairResults, selectPair);
    }, 150);
  });

  sourceSelect.addEventListener("change", () => {
    currentSource = sourceSelect.value;
    clearPlayer();
  });

  clearBtn.addEventListener("click", clearPlayer);
  pairClearBtn.addEventListener("click", clearPair);
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      handleShare();
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".profile-search-wrapper")) {
      hideResults(resultsList);
      hideResults(pairResults);
    }
  });

  /* ── Restore saved state ── */
  const selectPlayerByLicence = (licenceId, sourceHint) => {
    const licence = String(licenceId || "").trim();
    if (!licence) return false;

    const sourceOrder = [];
    if (sourceHint === "male" || sourceHint === "female") sourceOrder.push(sourceHint);
    if (!sourceOrder.includes(currentSource)) sourceOrder.push(currentSource);
    if (!sourceOrder.includes("male")) sourceOrder.push("male");
    if (!sourceOrder.includes("female")) sourceOrder.push("female");

    for (const source of sourceOrder) {
      const rankings = getRankings(source);
      const player = rankings.find(
        (p) => String(p.LicenceNumber || "").trim() === licence,
      );
      if (!player) continue;

      currentSource = source;
      sourceSelect.value = source;
      selectPlayer(player, { syncUrl: false });
      return true;
    }

    return false;
  };

  const restoreFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const licenceId = String(params.get("licenceid") || "").trim();
    const sourceHint = String(params.get("source") || "").trim();
    if (!licenceId) return false;

    return selectPlayerByLicence(licenceId, sourceHint);
  };

  const restoreSaved = () => {
    const saved = loadSaved();
    if (!saved?.source || !saved?.playerId) return;

    currentSource = saved.source;
    sourceSelect.value = currentSource;

    const rankings = getRankings(currentSource);
    const player = rankings.find((p) => p.PlayerID === saved.playerId);
    if (player) {
      selectPlayer(player, { syncUrl: false });
    } else {
      clearSaved();
    }
  };

  setShareVisible(false);
  await loadAllRankings();

  if (!rankingsStore.male.length && !rankingsStore.female.length) {
    const wrapper = searchInput?.closest(".profile-search-wrapper");
    if (wrapper) {
      wrapper.insertAdjacentHTML(
        "beforebegin",
        '<div class="profile-load-error" style="color:var(--danger,#c00);margin-bottom:0.5rem">Não foi possível carregar os dados de ranking.</div>',
      );
    }
  }

  if (!restoreFromQuery()) {
    restoreSaved();
  }
})();
