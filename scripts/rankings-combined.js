/* globals escapeHtml, normalizeSearchText */

const ROWS_PER_PAGE = 100;
const CDN_BASE = "../data/rankings";

const tbody = document.getElementById("rankingsBody");
const meta = document.getElementById("rankingsMeta");
const prevPageBtn = document.getElementById("rankingsPrevPage");
const nextPageBtn = document.getElementById("rankingsNextPage");
const pageInput = document.getElementById("rankingsPageInput");
const totalPagesEl = document.getElementById("rankingsTotalPages");
const firstPageBtn = document.getElementById("rankingsFirstPage");
const lastPageBtn = document.getElementById("rankingsLastPage");
const prevPageBtnTop = document.getElementById("rankingsPrevPageTop");
const nextPageBtnTop = document.getElementById("rankingsNextPageTop");
const pageInputTop = document.getElementById("rankingsPageInputTop");
const totalPagesElTop = document.getElementById("rankingsTotalPagesTop");
const firstPageBtnTop = document.getElementById("rankingsFirstPageTop");
const lastPageBtnTop = document.getElementById("rankingsLastPageTop");
const sourceSelect = document.getElementById("rankingsSource");
const searchInput = document.getElementById("rankingsSearch");
const levelFilter = document.getElementById("rankingsFilterLevel");
const ageFilter = document.getElementById("rankingsFilterAge");
const clubFilter = document.getElementById("rankingsFilterClub");

let currentPage = 1;
let sortedRows = [];
let filteredRows = [];
let currentDate = "";

const getPageFromUrl = () => {
  const p = parseInt(new URLSearchParams(location.search).get("page"));
  return Number.isFinite(p) && p > 0 ? p : 1;
};

const pushPageToUrl = (page) => {
  const params = new URLSearchParams(location.search);
  params.set("page", page);
  history.replaceState(null, "", `${location.pathname}?${params}`);
};

const parseRankingNumber = (value) => {
  const asNumber = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(asNumber) ? asNumber : Number.MAX_SAFE_INTEGER;
};

const formatRankingChange = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "-") return "-";
  const num = Number(raw);
  if (!Number.isFinite(num) || num === 0) return raw;
  if (num > 0) return `<span style="color:#2e7d32">+${raw}</span>`;
  return `<span style="color:#c62828">${raw}</span>`;
};

const getTiePlayerUrl = (playerId) => {
  const normalizedId = String(playerId ?? "").trim();
  if (!normalizedId) return "";
  return `https://www.tiepadel.com/Advanced-stats/${encodeURIComponent(normalizedId)}`;
};

const getTiePadelDashboardUrl = (playerId) => {
  const normalizedId = String(playerId ?? "").trim();
  if (!normalizedId) return "";
  return `https://www.tiepadel.com/Dashboard.aspx?id=${encodeURIComponent(normalizedId)}`;
};

const renderLicenceCell = (player) => {
  const licenceNumber = String(player?.LicenceNumber ?? "").trim();
  if (!licenceNumber) return "-";
  const url = getTiePadelDashboardUrl(player?.PlayerID);
  if (!url) return escapeHtml(licenceNumber);
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(licenceNumber)}</a>`;
};

const isYouthAgeType = (value) => {
  const normalized = normalizeSearchText(value).replaceAll(" ", "");
  return normalized.startsWith("sub") || normalized.startsWith("jov");
};

const sortAgeTypes = (values) =>
  [...values].sort((a, b) => {
    const aNorm = normalizeSearchText(a).replaceAll(" ", "");
    const bNorm = normalizeSearchText(b).replaceAll(" ", "");
    const aPriority = aNorm === "abs" ? 0 : isYouthAgeType(a) ? 1 : 2;
    const bPriority = bNorm === "abs" ? 0 : isYouthAgeType(b) ? 1 : 2;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.localeCompare(b, "pt");
  });

const uniqueSortedValues = (rows, key) =>
  [
    ...new Set(
      rows.map((row) => String(row?.[key] ?? "").trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt"));

const fillSelectOptions = (selectElement, values, allLabel) => {
  if (!selectElement) return;
  const current = selectElement.value || "all";
  selectElement.innerHTML = [
    `<option value="all">${allLabel}</option>`,
    ...values.map(
      (value) =>
        `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`,
    ),
  ].join("");
  selectElement.value = values.includes(current) ? current : "all";
};

const getSourceConfig = () => {
  const source = sourceSelect?.value === "female" ? "female" : "male";
  return { source, label: source === "female" ? "Feminino" : "Masculino" };
};

const formatFileDate = (fileName) => {
  const match = fileName.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return fileName;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
};

const renderCurrentPage = () => {
  if (!filteredRows.length) {
    tbody.innerHTML =
      '<tr><td colspan="10">Sem dados disponíveis de momento.</td></tr>';
    [pageInput, pageInputTop].forEach(el => { if (el) { el.value = 0; el.max = 0; } });
    [totalPagesEl, totalPagesElTop].forEach(el => { if (el) el.textContent = 0; });
    [firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn,
     firstPageBtnTop, prevPageBtnTop, nextPageBtnTop, lastPageBtnTop]
      .forEach(b => { if (b) b.disabled = true; });
    return;
  }

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * ROWS_PER_PAGE;
  const pageRows = filteredRows.slice(start, start + ROWS_PER_PAGE);

  tbody.innerHTML = pageRows
    .map(
      (player) => `
    <tr>
      <td>${escapeHtml(player.Ranking)}</td>
      <td>${formatRankingChange(player.RankingChange)}</td>
      <td>${renderLicenceCell(player)}</td>
      <td>${escapeHtml(player.Name)}</td>
      <td>${escapeHtml(player.Points)}</td>
      <td>${escapeHtml(player.Club || "-")}</td>
      <td>${escapeHtml(player.Level)}</td>
      <td>${escapeHtml(player.AgeType)}</td>
      <td>${escapeHtml(player.NumberOfValidTournaments)}</td>
      <td>${
        getTiePlayerUrl(player.PlayerID)
          ? `<a href="${escapeHtml(getTiePlayerUrl(player.PlayerID))}" target="_blank" rel="noopener noreferrer">Ver</a>`
          : "-"
      }</td>
    </tr>
  `,
    )
    .join("");

  if (pageInput) { pageInput.value = currentPage; pageInput.max = totalPages; }
  if (totalPagesEl) totalPagesEl.textContent = totalPages;
  if (pageInputTop) { pageInputTop.value = currentPage; pageInputTop.max = totalPages; }
  if (totalPagesElTop) totalPagesElTop.textContent = totalPages;
  const atFirst = currentPage <= 1;
  const atLast = currentPage >= totalPages;
  if (firstPageBtn) firstPageBtn.disabled = atFirst;
  if (prevPageBtn) prevPageBtn.disabled = atFirst;
  if (nextPageBtn) nextPageBtn.disabled = atLast;
  if (lastPageBtn) lastPageBtn.disabled = atLast;
  if (firstPageBtnTop) firstPageBtnTop.disabled = atFirst;
  if (prevPageBtnTop) prevPageBtnTop.disabled = atFirst;
  if (nextPageBtnTop) nextPageBtnTop.disabled = atLast;
  if (lastPageBtnTop) lastPageBtnTop.disabled = atLast;
  pushPageToUrl(currentPage);
};

const applyFilters = (resetPage = true) => {
  const queryTerms = String(searchInput?.value || "")
    .split(",")
    .map((term) => normalizeSearchText(term.trim()))
    .filter(Boolean);
  const levelValue = levelFilter?.value || "all";
  const ageValue = ageFilter?.value || "all";
  const clubValue = clubFilter?.value || "all";

  filteredRows = sortedRows.filter((player) => {
    const normalizedName = normalizeSearchText(String(player?.Name || ""));
    const normalizedClub = normalizeSearchText(String(player?.Club || ""));
    const normalizedLicence = normalizeSearchText(String(player?.LicenceNumber || ""));
    const level = String(player?.Level || "");
    const age = String(player?.AgeType || "");

    const matchesSearch =
      queryTerms.length === 0 ||
      queryTerms.some(
        (term) =>
          normalizedName.includes(term) ||
          normalizedClub.includes(term) ||
          normalizedLicence.includes(term),
      );
    return (
      matchesSearch &&
      (levelValue === "all" || level === levelValue) &&
      (ageValue === "all" || age === ageValue) &&
      (clubValue === "all" || String(player?.Club || "") === clubValue)
    );
  });

  if (resetPage) currentPage = 1;
  renderCurrentPage();

  if (meta) {
    meta.textContent = `Fonte: FPP (${formatFileDate(currentDate)}) · ${filteredRows.length} / ${sortedRows.length} atletas`;
  }
};

const renderRows = (rows) => {
  sortedRows = [...rows].sort(
    (a, b) => parseRankingNumber(a.Ranking) - parseRankingNumber(b.Ranking),
  );

  fillSelectOptions(levelFilter, uniqueSortedValues(sortedRows, "Level"), "Todos os níveis");
  fillSelectOptions(ageFilter, sortAgeTypes(uniqueSortedValues(sortedRows, "AgeType")), "Todos os escalões");
  fillSelectOptions(clubFilter, uniqueSortedValues(sortedRows, "Club"), "Todos os clubes");

  currentPage = getPageFromUrl();
  applyFilters(false); // don't reset page — use the one from URL
};

if (firstPageBtn)
  firstPageBtn.addEventListener("click", () => { currentPage = 1; renderCurrentPage(); });
if (prevPageBtn)
  prevPageBtn.addEventListener("click", () => { currentPage -= 1; renderCurrentPage(); });
if (nextPageBtn)
  nextPageBtn.addEventListener("click", () => { currentPage += 1; renderCurrentPage(); });
if (lastPageBtn)
  lastPageBtn.addEventListener("click", () => { currentPage = Math.ceil(filteredRows.length / ROWS_PER_PAGE); renderCurrentPage(); });
if (pageInput)
  pageInput.addEventListener("change", () => {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
    const val = parseInt(pageInput.value);
    currentPage = Number.isFinite(val) ? Math.min(Math.max(val, 1), totalPages) : 1;
    renderCurrentPage();
  });
if (firstPageBtnTop)
  firstPageBtnTop.addEventListener("click", () => { currentPage = 1; renderCurrentPage(); });
if (prevPageBtnTop)
  prevPageBtnTop.addEventListener("click", () => { currentPage -= 1; renderCurrentPage(); });
if (nextPageBtnTop)
  nextPageBtnTop.addEventListener("click", () => { currentPage += 1; renderCurrentPage(); });
if (lastPageBtnTop)
  lastPageBtnTop.addEventListener("click", () => { currentPage = Math.ceil(filteredRows.length / ROWS_PER_PAGE); renderCurrentPage(); });
if (pageInputTop)
  pageInputTop.addEventListener("change", () => {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
    const val = parseInt(pageInputTop.value);
    currentPage = Number.isFinite(val) ? Math.min(Math.max(val, 1), totalPages) : 1;
    renderCurrentPage();
  });
if (searchInput) searchInput.addEventListener("input", applyFilters);
if (levelFilter) levelFilter.addEventListener("change", applyFilters);
if (ageFilter) ageFilter.addEventListener("change", applyFilters);
if (clubFilter) clubFilter.addEventListener("change", applyFilters);

const loadRankings = async () => {
  const config = getSourceConfig();
  try {
    const response = await fetch(`${CDN_BASE}/${config.source}/latest.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const date = String(json?.date || "");
    const data = json?.rankings;
    if (!Array.isArray(data)) throw new Error("Invalid rankings format");
    currentDate = date;
    renderRows(data);
  } catch {
    if (meta) meta.textContent = "Não foi possível carregar o ranking.";
    if (tbody)
      tbody.innerHTML =
        '<tr><td colspan="10">Sem dados disponíveis de momento.</td></tr>';
  }
};

if (sourceSelect) {
  sourceSelect.addEventListener("change", () => {
    searchInput.value = "";
    currentPage = 1;
    loadRankings();
  });
}

loadRankings();
