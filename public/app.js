const resources = {
  reference: {
    eyebrow: 'GET_REF_DSSD',
    nav: 'Referensi',
    title: 'Referensi indikator',
    description: 'Telusuri daftar master indikator statistik sektoral, satuan, definisi, dan statusnya.',
    caption: 'Daftar referensi indikator',
    verifiedLabel: 'Status aktif',
    columns: [
      { label: 'Kode indikator', render: (row) => `<span class="code-cell">${escapeHtml(row.kodeindikator || '—')}</span>` },
      { label: 'Uraian indikator', render: (row) => `<span class="cell-title" title="${escapeHtml(row.uraian_indikator || '')}">${escapeHtml(row.uraian_indikator || 'Tanpa uraian')}</span><span class="cell-sub">${escapeHtml(row.definisi_operasional || 'Definisi belum tersedia')}</span>` },
      { label: 'Satuan', render: (row) => `<span class="cell-main">${escapeHtml(row.satuan || '—')}</span>` },
      { label: 'Bidang urusan', render: (row) => `<span class="cell-title" title="${escapeHtml(row.bidangurusan || '')}">${escapeHtml(row.bidangurusan || '—')}</span>` },
      { label: 'Status', render: (row) => statusBadge(row.status) }
    ]
  },
  entry: {
    eyebrow: 'GET_DSSD',
    nav: 'Hasil entry',
    title: 'Hasil entry data',
    description: 'Pantau nilai statistik sektoral yang telah diisikan beserta status verifikasi walidata.',
    caption: 'Hasil pengisian data sektoral',
    verifiedLabel: 'Terverifikasi',
    columns: [
      { label: 'Indikator', render: indicatorCell },
      { label: 'Tahun', render: (row) => `<span class="cell-main">${escapeHtml(row.tahun || '—')}</span>` },
      { label: 'Nilai', render: (row) => `<span class="value-cell">${escapeHtml(formatValue(row.data))}</span><span class="cell-sub">${escapeHtml(row.satuan || '')}</span>` },
      { label: 'Verifikasi walidata', render: (row) => verificationBadge(row.status_verifikasi_walidata) },
      { label: 'Status', render: (row) => statusBadge(row.status) },
      { label: 'Pembaruan', render: (row) => `<span class="cell-main">${escapeHtml(formatDate(row.lastupdate))}</span>` }
    ]
  },
  final: {
    eyebrow: 'GET_DSSD_FINAL',
    nav: 'Data final',
    title: 'Data statistik final',
    description: 'Lihat data statistik sektoral yang telah mencapai tahap final untuk tahun yang dipilih.',
    caption: 'Data statistik sektoral final',
    verifiedLabel: 'Terverifikasi',
    columns: [
      { label: 'Indikator', render: indicatorCell },
      { label: 'Tahun', render: (row) => `<span class="cell-main">${escapeHtml(row.tahun || '—')}</span>` },
      { label: 'Nilai final', render: (row) => `<span class="value-cell">${escapeHtml(formatValue(row.data))}</span><span class="cell-sub">${escapeHtml(row.satuan || '')}</span>` },
      { label: 'Bidang urusan', render: (row) => `<span class="cell-title">${escapeHtml(row.uraibidang || row.bidangurusan || '—')}</span>` },
      { label: 'Status', render: (row) => statusBadge(row.status) },
      { label: 'Pembaruan', render: (row) => `<span class="cell-main">${escapeHtml(formatDate(row.lastupdate))}</span>` }
    ]
  }
};

const state = {
  resource: 'reference',
  rows: [],
  filteredRows: [],
  total: 0,
  offset: 0,
  limit: 10,
  year: '2025',
  mode: null,
  loading: false,
  selectedRow: null
};

const elements = {
  navButtons: [...document.querySelectorAll('[data-resource]')],
  sidebar: document.getElementById('sidebar'),
  mobileMenu: document.getElementById('mobileMenu'),
  breadcrumbCurrent: document.getElementById('breadcrumbCurrent'),
  resourceEyebrow: document.getElementById('resourceEyebrow'),
  resourceTitle: document.getElementById('resourceTitle'),
  resourceDescription: document.getElementById('resourceDescription'),
  modeBadge: document.getElementById('modeBadge'),
  serviceDot: document.getElementById('serviceDot'),
  serviceText: document.getElementById('serviceText'),
  demoBanner: document.getElementById('demoBanner'),
  exportBtn: document.getElementById('exportBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  statPage: document.getElementById('statPage'),
  statTotal: document.getElementById('statTotal'),
  statVerified: document.getElementById('statVerified'),
  statUpdated: document.getElementById('statUpdated'),
  verifiedLabel: document.getElementById('verifiedLabel'),
  searchInput: document.getElementById('searchInput'),
  yearGroup: document.getElementById('yearGroup'),
  yearInput: document.getElementById('yearInput'),
  limitSelect: document.getElementById('limitSelect'),
  applyFilters: document.getElementById('applyFilters'),
  errorBanner: document.getElementById('errorBanner'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn'),
  tableCaption: document.getElementById('tableCaption'),
  resultSummary: document.getElementById('resultSummary'),
  tableHead: document.getElementById('tableHead'),
  tableBody: document.getElementById('tableBody'),
  loadingState: document.getElementById('loadingState'),
  emptyState: document.getElementById('emptyState'),
  pageInfo: document.getElementById('pageInfo'),
  prevBtn: document.getElementById('prevBtn'),
  nextBtn: document.getElementById('nextBtn'),
  detailModal: document.getElementById('detailModal'),
  closeModal: document.getElementById('closeModal'),
  detailCode: document.getElementById('detailCode'),
  detailTitle: document.getElementById('detailTitle'),
  detailSummary: document.getElementById('detailSummary'),
  detailJson: document.getElementById('detailJson'),
  copyJson: document.getElementById('copyJson'),
  toast: document.getElementById('toast')
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat('id-ID').format(number) : String(value ?? '—');
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  const normalized = String(value).replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(number) : String(value);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function statusBadge(status) {
  const value = String(status || 'Tidak diketahui').toUpperCase();
  const style = value === 'AKTIF' || value === 'ACTIVE'
    ? 'success'
    : value.includes('DISABLE') || value === 'NONAKTIF'
      ? 'danger'
      : 'neutral';
  return `<span class="badge ${style}">${escapeHtml(value)}</span>`;
}

function verificationBadge(value) {
  const normalized = String(value ?? '').toUpperCase();
  if (['Y', 'YES', 'TRUE', '1', 'VERIFIED'].includes(normalized)) {
    return '<span class="badge success">Terverifikasi</span>';
  }
  if (['N', 'NO', 'FALSE', '0'].includes(normalized)) {
    return '<span class="badge warning">Perlu ditinjau</span>';
  }
  return '<span class="badge neutral">Belum ada status</span>';
}

function indicatorCell(row) {
  return `<span class="cell-title" title="${escapeHtml(row.uraian_indikator || '')}">${escapeHtml(row.uraian_indikator || 'Tanpa uraian')}</span><span class="cell-sub code-cell">${escapeHtml(row.kodeindikator || '—')}</span>`;
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('Server tidak merespons');
    const health = await response.json();
    state.mode = health.mode;
    elements.serviceDot.className = 'status-dot online';
    elements.serviceText.textContent = 'Server terhubung';
    elements.modeBadge.textContent = health.mode === 'demo' ? 'Demo' : 'Live';
    elements.modeBadge.className = `mode-pill ${health.mode}`;
    elements.demoBanner.classList.toggle('hidden', health.mode !== 'demo');
  } catch {
    elements.serviceDot.className = 'status-dot error';
    elements.serviceText.textContent = 'Server bermasalah';
    elements.modeBadge.textContent = 'Offline';
    elements.modeBadge.className = 'mode-pill';
  }
}

function setResource(resource) {
  if (!resources[resource] || state.resource === resource) return;
  state.resource = resource;
  state.offset = 0;
  elements.searchInput.value = '';
  elements.navButtons.forEach((button) => button.classList.toggle('active', button.dataset.resource === resource));
  updateResourceHeader();
  elements.sidebar.classList.remove('open');
  elements.mobileMenu.setAttribute('aria-expanded', 'false');
  loadData();
}

function updateResourceHeader() {
  const config = resources[state.resource];
  elements.breadcrumbCurrent.textContent = config.nav;
  elements.resourceEyebrow.textContent = config.eyebrow;
  elements.resourceTitle.textContent = config.title;
  elements.resourceDescription.textContent = config.description;
  elements.tableCaption.textContent = config.caption;
  elements.verifiedLabel.textContent = config.verifiedLabel;
  elements.yearGroup.classList.toggle('hidden', state.resource === 'reference');
  renderTableHeader();
}

function renderTableHeader() {
  const columns = resources[state.resource].columns;
  elements.tableHead.innerHTML = `<tr>${columns.map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`).join('')}</tr>`;
}

function setLoading(loading) {
  state.loading = loading;
  elements.loadingState.classList.toggle('hidden', !loading);
  elements.refreshBtn.disabled = loading;
  elements.applyFilters.disabled = loading;
  if (loading) {
    elements.emptyState.classList.add('hidden');
    elements.errorBanner.classList.add('hidden');
  }
}

async function loadData() {
  setLoading(true);
  const params = new URLSearchParams({
    limit: String(state.limit),
    offset: String(state.offset)
  });
  if (state.resource !== 'reference') params.set('year', state.year);

  try {
    const response = await fetch(`/api/data/${state.resource}?${params}`);
    let payload = {};
    try { payload = await response.json(); } catch { /* handled below */ }
    if (!response.ok) throw new Error(payload.error || `Permintaan gagal (${response.status})`);

    state.rows = Array.isArray(payload.data) ? payload.data : [];
    state.total = Number(payload.meta?.total) || state.rows.length;
    state.mode = payload.meta?.mode || state.mode;
    applyLocalSearch();
    updateStats(payload.meta?.fetchedAt);
    updatePagination();
    elements.errorBanner.classList.add('hidden');
  } catch (error) {
    state.rows = [];
    state.filteredRows = [];
    state.total = 0;
    renderRows();
    updateStats();
    updatePagination();
    elements.errorMessage.textContent = error.message;
    elements.errorBanner.classList.remove('hidden');
  } finally {
    setLoading(false);
    updatePagination();
    const hasError = !elements.errorBanner.classList.contains('hidden');
    elements.emptyState.classList.toggle('hidden', hasError || state.filteredRows.length > 0);
  }
}

function applyLocalSearch() {
  const query = elements.searchInput.value.trim().toLocaleLowerCase('id-ID');
  state.filteredRows = query
    ? state.rows.filter((row) => Object.values(row).some((value) => {
        if (value === null || typeof value === 'object') return false;
        return String(value).toLocaleLowerCase('id-ID').includes(query);
      }))
    : [...state.rows];
  renderRows();
  updateResultSummary();
}

function renderRows() {
  const columns = resources[state.resource].columns;
  elements.tableBody.innerHTML = state.filteredRows.map((row, index) => (
    `<tr tabindex="0" data-index="${index}" aria-label="Buka detail ${escapeHtml(row.uraian_indikator || row.kodeindikator || '')}">${columns.map((column) => `<td>${column.render(row)}</td>`).join('')}</tr>`
  )).join('');
  elements.emptyState.classList.toggle('hidden', state.loading || state.filteredRows.length > 0);
}

function updateResultSummary() {
  const hasQuery = Boolean(elements.searchInput.value.trim());
  const visible = state.filteredRows.length;
  if (hasQuery) {
    elements.resultSummary.textContent = `${formatNumber(visible)} cocok dari ${formatNumber(state.rows.length)} data pada halaman ini`;
  } else if (state.total) {
    const start = state.rows.length ? state.offset + 1 : 0;
    const end = state.offset + state.rows.length;
    elements.resultSummary.textContent = `Menampilkan ${formatNumber(start)}–${formatNumber(end)} dari ${formatNumber(state.total)} data`;
  } else {
    elements.resultSummary.textContent = 'Tidak ada data untuk ditampilkan';
  }
}

function updateStats(fetchedAt) {
  elements.statPage.textContent = formatNumber(state.rows.length);
  elements.statTotal.textContent = formatNumber(state.total);
  const positive = state.resource === 'reference'
    ? state.rows.filter((row) => ['AKTIF', 'ACTIVE'].includes(String(row.status || '').toUpperCase())).length
    : state.rows.filter((row) => ['Y', 'YES', 'TRUE', '1', 'VERIFIED'].includes(String(row.status_verifikasi_walidata ?? '').toUpperCase())).length;
  elements.statVerified.textContent = formatNumber(positive);
  if (fetchedAt) {
    const date = new Date(fetchedAt);
    elements.statUpdated.textContent = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
  } else {
    elements.statUpdated.textContent = '—';
  }
}

function updatePagination() {
  const currentPage = Math.floor(state.offset / state.limit) + 1;
  const pageCount = Math.max(1, Math.ceil(state.total / state.limit));
  elements.pageInfo.textContent = `Halaman ${formatNumber(currentPage)} dari ${formatNumber(pageCount)}`;
  elements.prevBtn.disabled = state.loading || state.offset === 0;
  elements.nextBtn.disabled = state.loading || state.rows.length === 0 || state.offset + state.limit >= state.total;
  updateResultSummary();
}

function applyFilters() {
  const limit = Number(elements.limitSelect.value);
  const year = elements.yearInput.value.trim();
  if (state.resource !== 'reference' && (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > 2100)) {
    showToast('Masukkan tahun empat digit yang valid.');
    elements.yearInput.focus();
    return;
  }
  state.limit = limit;
  state.year = year;
  state.offset = 0;
  loadData();
}

function openDetail(row) {
  state.selectedRow = row;
  elements.detailCode.textContent = row.kodeindikator || 'Detail data';
  elements.detailTitle.textContent = row.uraian_indikator || 'Detail data';
  const summary = [
    ['Tahun', row.tahun || '—'],
    ['Nilai', row.data !== undefined ? `${formatValue(row.data)} ${row.satuan || ''}`.trim() : row.satuan || '—'],
    ['Status', row.status || '—'],
    ['Kode pemda', row.kodepemda || '—'],
    ['Walidata', row.walidata || '—'],
    ['Pembaruan', formatDate(row.lastupdate)]
  ];
  elements.detailSummary.innerHTML = summary.map(([label, value]) => `<div class="detail-item"><span>${escapeHtml(label)}</span><strong title="${escapeHtml(value)}">${escapeHtml(value)}</strong></div>`).join('');
  elements.detailJson.textContent = JSON.stringify(row, null, 2);
  elements.detailModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  elements.closeModal.focus();
}

function closeDetail() {
  elements.detailModal.classList.add('hidden');
  document.body.style.overflow = '';
  state.selectedRow = null;
}

async function copyJson() {
  if (!state.selectedRow) return;
  const text = JSON.stringify(state.selectedRow, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    showToast('JSON berhasil disalin.');
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
    showToast('JSON berhasil disalin.');
  }
}

function exportCsv() {
  if (!state.filteredRows.length) {
    showToast('Tidak ada data untuk diekspor.');
    return;
  }
  const keys = [...new Set(state.filteredRows.flatMap((row) => Object.keys(row).filter((key) => typeof row[key] !== 'object')))];
  const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const csv = [
    keys.map(escapeCsv).join(','),
    ...state.filteredRows.map((row) => keys.map((key) => escapeCsv(row[key])).join(','))
  ].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sipd-${state.resource}-${state.resource === 'reference' ? 'referensi' : state.year}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast(`${state.filteredRows.length} baris diekspor.`);
}

let toastTimer;
function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  toastTimer = setTimeout(() => elements.toast.classList.add('hidden'), 2600);
}

elements.navButtons.forEach((button) => button.addEventListener('click', () => setResource(button.dataset.resource)));
elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.refreshBtn.addEventListener('click', loadData);
elements.applyFilters.addEventListener('click', applyFilters);
elements.retryBtn.addEventListener('click', loadData);
elements.exportBtn.addEventListener('click', exportCsv);
elements.searchInput.addEventListener('input', applyLocalSearch);
elements.searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') applyFilters();
});
elements.yearInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') applyFilters();
});
elements.limitSelect.addEventListener('change', applyFilters);
elements.prevBtn.addEventListener('click', () => {
  state.offset = Math.max(0, state.offset - state.limit);
  loadData();
});
elements.nextBtn.addEventListener('click', () => {
  state.offset += state.limit;
  loadData();
});
elements.tableBody.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-index]');
  if (row) openDetail(state.filteredRows[Number(row.dataset.index)]);
});
elements.tableBody.addEventListener('keydown', (event) => {
  if (!['Enter', ' '].includes(event.key)) return;
  const row = event.target.closest('tr[data-index]');
  if (row) {
    event.preventDefault();
    openDetail(state.filteredRows[Number(row.dataset.index)]);
  }
});
elements.closeModal.addEventListener('click', closeDetail);
elements.detailModal.addEventListener('click', (event) => {
  if (event.target === elements.detailModal) closeDetail();
});
elements.copyJson.addEventListener('click', copyJson);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.detailModal.classList.contains('hidden')) closeDetail();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    elements.searchInput.focus();
  }
});

updateResourceHeader();
checkHealth();
loadData();
