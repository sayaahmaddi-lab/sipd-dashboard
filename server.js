require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);
const HOST = (process.env.HOST || '127.0.0.1').trim();
const SIPD_BASE_URL = (process.env.SIPD_BASE_URL || 'https://sipd.go.id/ewalidata/serv').replace(/\/$/, '');
const SIPD_API_KEY = (process.env.SIPD_API_KEY || '').trim();
const SIPD_KODEPEMDA = (process.env.SIPD_KODEPEMDA || '').trim();
const hasExplicitDemoSetting = typeof process.env.DEMO_MODE === 'string';
const DEMO_MODE = hasExplicitDemoSetting
  ? process.env.DEMO_MODE.toLowerCase() === 'true'
  : !SIPD_API_KEY || !SIPD_KODEPEMDA;

const resources = {
  reference: { endpoint: 'get_ref_dssd', year: false },
  entry: { endpoint: 'get_dssd', year: true },
  final: { endpoint: 'get_dssd_final', year: true, requireYear: true }
};

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

function parseInteger(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(String(value))) return null;
  const number = Number.parseInt(value, 10);
  if (number < min || number > max) return null;
  return number;
}

function validateYear(value, required) {
  if (!value) return required ? null : '';
  if (!/^\d{4}$/.test(String(value))) return null;
  const year = Number(value);
  if (year < 2000 || year > 2100) return null;
  return String(year);
}

function createHttpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function normalizeApiPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  throw createHttpError(502, 'Format respons SIPD tidak dikenali.', {
    hint: 'Server mengharapkan array JSON.'
  });
}

async function requestSipd(endpoint, query) {
  const url = new URL(`${SIPD_BASE_URL}/${endpoint}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SIPD_API_KEY}`,
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    const raw = await response.text();
    let payload;
    try {
      payload = raw ? JSON.parse(raw) : [];
    } catch {
      throw createHttpError(502, 'SIPD mengirim respons yang bukan JSON.', {
        upstreamStatus: response.status
      });
    }

    if (!response.ok) {
      const safeMessage = payload?.msg || payload?.message || `SIPD merespons dengan status ${response.status}.`;
      throw createHttpError(response.status, safeMessage, { upstreamStatus: response.status });
    }

    return normalizeApiPayload(payload);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw createHttpError(504, 'Waktu koneksi ke SIPD habis. Silakan coba lagi.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

const indicatorNames = [
  ['Jumlah sekolah dasar negeri', 'Unit'],
  ['Jumlah sekolah dasar swasta', 'Unit'],
  ['Jumlah siswa sekolah dasar', 'Orang'],
  ['Jumlah tenaga pendidik bersertifikat', 'Orang'],
  ['Persentase anak usia sekolah yang bersekolah', 'Persen'],
  ['Jumlah fasilitas pelayanan kesehatan', 'Unit'],
  ['Jumlah tenaga kesehatan', 'Orang'],
  ['Cakupan pelayanan kesehatan dasar', 'Persen'],
  ['Jumlah rumah tangga dengan akses air minum layak', 'Rumah Tangga'],
  ['Persentase jalan daerah dalam kondisi baik', 'Persen'],
  ['Jumlah usaha mikro aktif', 'Unit Usaha'],
  ['Tingkat partisipasi angkatan kerja', 'Persen'],
  ['Jumlah kunjungan wisatawan', 'Orang'],
  ['Luas kawasan pertanian produktif', 'Hektare'],
  ['Produksi perikanan tangkap', 'Ton'],
  ['Jumlah desa dengan akses internet', 'Desa'],
  ['Persentase layanan publik berbasis elektronik', 'Persen'],
  ['Jumlah penduduk dengan dokumen kependudukan', 'Orang']
];

function buildDemoRecords(resource) {
  const fields = indicatorNames.flatMap((item, index) => [0, 1].map((variant) => {
    const sequence = index * 2 + variant + 474;
    const code = `1.${String((index % 6) + 1).padStart(2, '0')}.${String(sequence).padStart(6, '0')}`;
    const year = String(2025 - variant);
    const value = item[1] === 'Persen'
      ? String((72.4 + ((index * 3 + variant) % 24)).toFixed(1))
      : String(120 + index * 137 + variant * 41);
    const base = {
      kodeindikator: code,
      uraian_indikator: item[0],
      satuan: item[1],
      kodepemda: SIPD_KODEPEMDA || '1174',
      kodekec: '0',
      tahun: year,
      data: value,
      bidangurusan: `${String((index % 6) + 1).padStart(2, '0')} - Bidang urusan contoh`,
      uraibidang: 'Bidang urusan contoh',
      definisi_operasional: `${item[0]} dalam wilayah pemerintah daerah pada tahun berjalan.`,
      status: index % 8 === 0 ? 'DISABLED' : 'AKTIF',
      status_verifikasi_walidata: index % 5 === 0 ? 'N' : 'Y',
      status_verifikasi_pembinadata: index % 6 === 0 ? 'N' : 'Y',
      catatan_verifikasi_walidata: index % 5 === 0 ? 'Perlu pemeriksaan kembali.' : null,
      walidata: 'Dinas Komunikasi dan Informatika',
      lastupdate: `2026-08-${String((index % 12) + 1).padStart(2, '0')} 09:30:00`,
      idtransaksi: `demo-${sequence}-${year}`
    };

    if (resource === 'reference') {
      return {
        kodeindikator: base.kodeindikator,
        uraian_indikator: base.uraian_indikator,
        satuan: base.satuan,
        definisi_operasional: base.definisi_operasional,
        bidangurusan: base.bidangurusan,
        status: base.status,
        lastupdate: base.lastupdate
      };
    }
    return base;
  }));

  return resource === 'final'
    ? fields.filter((record) => record.status_verifikasi_walidata === 'Y')
    : fields;
}

function getDemoData(resource, { year, limit, offset }) {
  let records = buildDemoRecords(resource);
  if (year && resource !== 'reference') {
    records = records.filter((record) => record.tahun === year);
  }
  const total = records.length;
  return records.slice(offset, offset + limit).map((record, index) => ({
    ...record,
    rownum: offset + index + 1,
    rowtotal: total
  }));
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mode: DEMO_MODE ? 'demo' : 'live',
    configured: DEMO_MODE || Boolean(SIPD_API_KEY && SIPD_KODEPEMDA),
    kodepemdaConfigured: Boolean(SIPD_KODEPEMDA),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/data/:resource', async (req, res, next) => {
  try {
    const resourceName = req.params.resource;
    const config = resources[resourceName];
    if (!config) throw createHttpError(404, 'Jenis data tidak tersedia.');

    const limit = parseInteger(req.query.limit, 10, { min: 1, max: 100 });
    const offset = parseInteger(req.query.offset, 0, { min: 0, max: 1_000_000 });
    const year = validateYear(req.query.year, config.requireYear);

    if (limit === null) throw createHttpError(400, 'Parameter limit harus berupa angka 1–100.');
    if (offset === null) throw createHttpError(400, 'Parameter offset tidak valid.');
    if (year === null) throw createHttpError(400, 'Tahun wajib diisi dengan empat digit yang valid.');

    if (!DEMO_MODE && (!SIPD_API_KEY || !SIPD_KODEPEMDA)) {
      throw createHttpError(503, 'Konfigurasi SIPD belum lengkap di server.');
    }

    const query = {
      kodepemda: SIPD_KODEPEMDA,
      limit,
      offset
    };
    if (config.year && year) query.tahun = year;

    const data = DEMO_MODE
      ? getDemoData(resourceName, { year, limit, offset })
      : await requestSipd(config.endpoint, query);

    const reportedTotal = Number.parseInt(data[0]?.rowtotal, 10);
    const total = Number.isFinite(reportedTotal) ? reportedTotal : offset + data.length;

    res.json({
      data,
      meta: {
        resource: resourceName,
        mode: DEMO_MODE ? 'demo' : 'live',
        limit,
        offset,
        total,
        year: year || null,
        fetchedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  console.error(`[${new Date().toISOString()}]`, error.message);
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({
    error: status >= 500 && !error.status ? 'Terjadi kesalahan pada server.' : error.message,
    details: error.details || undefined
  });
});

// Vercel mengimpor dan menjalankan aplikasi Express sebagai sebuah Function.
// Di localhost, file ini dijalankan langsung dan perlu membuka port sendiri.
if (require.main === module && !process.env.VERCEL) {
  app.listen(PORT, HOST, () => {
    console.log(`Dashboard SIPD berjalan di http://${HOST}:${PORT}`);
    console.log(`Mode: ${DEMO_MODE ? 'DEMO (data simulasi)' : 'LIVE (API SIPD)'}`);
  });
}

module.exports = app;
