# Dashboard SIPD E-Walidata

Website read-only untuk melihat referensi indikator, hasil entry, dan data final dari API SIPD E-Walidata. API key hanya disimpan dan digunakan oleh backend Node.js—tidak pernah dikirim ke browser.

## Fitur

- Referensi indikator (`get_ref_dssd`)
- Hasil entry (`get_dssd`)
- Data final (`get_dssd_final`)
- Pencarian pada halaman aktif
- Pagination, detail JSON, dan ekspor CSV
- Mode demo otomatis jika kredensial belum diatur
- Antarmuka responsif

## Menjalankan mode demo

```bash
npm install
npm start
```

Buka `http://localhost:3000`.

## Menghubungkan ke API SIPD

1. Salin contoh konfigurasi:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env`:

   ```env
   PORT=3000
   HOST=127.0.0.1
   SIPD_BASE_URL=https://sipd.go.id/ewalidata/serv
   SIPD_API_KEY=token_resmi_anda
   SIPD_KODEPEMDA=kode_pemda_anda
   DEMO_MODE=false
   ```

3. Mulai ulang server:

   ```bash
   npm start
   ```

Jangan memasukkan token ke `public/app.js`, HTML, URL, atau repository Git. File `.env` sudah dicantumkan dalam `.gitignore`.

## Arsitektur

```text
Browser ──GET /api/data/...──> Backend Node.js ──Bearer token──> SIPD
```

Browser hanya berbicara kepada backend yang berada pada origin yang sama. Backend mengambil token dari `.env` dan meneruskan permintaan ke SIPD.

## Endpoint internal website

- `GET /api/health`
- `GET /api/data/reference?limit=10&offset=0`
- `GET /api/data/entry?year=2025&limit=10&offset=0`
- `GET /api/data/final?year=2025&limit=10&offset=0`

## Deploy ke Vercel

Aplikasi mengekspor instance Express untuk dijalankan sebagai Vercel Function, sementara isi `public/` disajikan sebagai aset statis. Impor repository GitHub ke Vercel tanpa Build Command atau Output Directory khusus.

Atur Environment Variables berikut melalui **Project → Settings → Environment Variables**:

```env
SIPD_BASE_URL=https://sipd.go.id/ewalidata/serv
SIPD_API_KEY=token_resmi_anda
SIPD_KODEPEMDA=kode_pemda_anda
DEMO_MODE=false
```

Jangan mengunggah `.env`, dan jangan menambahkan `PORT`/`HOST` di Vercel. Setelah mengubah variabel, lakukan Redeploy. Untuk penggunaan internal, aktifkan Deployment Protection atau tambahkan autentikasi aplikasi. Panduan lengkap tersedia di `PANDUAN-VERCEL-GITHUB.txt`.

## Catatan endpoint final

Dokumentasi SIPD menampilkan ketidakkonsistenan pada Resource URL `get_dssd_final`, sedangkan contoh detail menggunakan `/serv/get_dssd_final`. Proyek ini menggunakan endpoint contoh tersebut. Konfirmasikan kepada pengelola SIPD sebelum digunakan di produksi.
