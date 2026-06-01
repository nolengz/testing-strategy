# 📊 Treasury Monitor — USDT/IDR Live Order Book

Clone dari konsep: [treasury-monitoring.pages.dev](https://treasury-monitoring.pages.dev/)

---

## 🗂️ Struktur Project

```
treasury-monitor/
├── frontend/
│   └── index.html          ← Halaman utama (deploy ke Cloudflare Pages / GitHub Pages)
└── worker/
    ├── index.js            ← Cloudflare Worker (proxy API, hindari CORS)
    └── wrangler.toml       ← Konfigurasi Wrangler CLI
```

---

## 🚀 Cara Deploy — Step by Step

### OPSI A: Cloudflare Pages + Workers (Recommended — gratis!)

#### Langkah 1: Install Wrangler CLI

```bash
npm install -g wrangler
```

#### Langkah 2: Login ke Cloudflare

```bash
wrangler login
```
Browser akan terbuka, login dengan akun Cloudflare Anda (daftar gratis di cloudflare.com).

#### Langkah 3: Deploy Cloudflare Worker (proxy)

```bash
cd worker
wrangler deploy
```

Setelah deploy, Anda akan mendapat URL seperti:
```
https://treasury-monitor-worker.YOUR_SUBDOMAIN.workers.dev
```

**Salin URL ini!**

#### Langkah 4: Update frontend/index.html

Di `frontend/index.html`, cari baris ini (sekitar baris 390):

```javascript
const USE_CORS_PROXY = true;   // ← ubah ke false
```

Lalu uncomment dan isi URL Worker:

```javascript
const USE_CORS_PROXY = false;
const WORKER_BASE = 'https://treasury-monitor-worker.YOUR_SUBDOMAIN.workers.dev';
```

#### Langkah 5: Deploy frontend ke Cloudflare Pages

**Cara 1 — Via GitHub (paling mudah):**
1. Push semua file ke GitHub repository Anda
2. Buka [pages.cloudflare.com](https://pages.cloudflare.com)
3. Klik **"Create a project"** → **"Connect to Git"**
4. Pilih repository Anda
5. Set:
   - **Build command:** (kosongkan)
   - **Build output directory:** `frontend`
6. Klik **"Save and Deploy"**
7. Anda mendapat URL: `https://nama-project.pages.dev`

**Cara 2 — Via Wrangler CLI:**
```bash
cd frontend
wrangler pages deploy . --project-name=treasury-monitor
```

---

### OPSI B: GitHub Pages saja (simple, tapi perlu CORS proxy publik)

1. Buat repository GitHub baru
2. Upload `frontend/index.html` sebagai `index.html` di root
3. Pastikan di `index.html`:
   ```javascript
   const USE_CORS_PROXY = true;  // tetap true
   const CORS_PROXY = 'https://corsproxy.io/?';  // pakai corsproxy
   ```
4. Di Settings repo → Pages → pilih branch `main`
5. Akses di: `https://username.github.io/nama-repo/`

> ⚠️ CORS proxy publik tidak stabil untuk produksi. Gunakan Cloudflare Worker untuk produksi.

---

## 🔧 Konfigurasi BCA e-Rate

BCA tidak menyediakan API publik. Ada 3 opsi:

### Opsi 1: Gunakan Worker untuk scrape BCA (produksi)
Tambahkan di `worker/index.js`:

```javascript
if (path === '/api/bca/erate') {
  // Scrape dari halaman BCA menggunakan HTML parsing
  const res = await fetch('https://www.bca.co.id/id/informasi/kurs');
  const html = await res.text();
  // Parse tabel kurs...
}
```

### Opsi 2: Gunakan exchange rate API gratis
Di `frontend/index.html`, `fetchBCA()` sudah menggunakan `api.exchangerate-api.com` sebagai fallback estimasi.

### Opsi 3: Input manual
Tambahkan input field di UI untuk input manual kurs BCA.

---

## 📡 API Endpoints yang Digunakan

| Exchange | Endpoint | Data |
|----------|----------|------|
| Reku | `https://api.reku.id/v2/coins` | Daftar koin |
| Reku | `https://api.reku.id/v2/orderbookall?id={id}` | Orderbook |
| Reku | `https://api.reku.id/v2/bidask` | Bid/ask semua koin |
| Indodax | `https://indodax.com/api/usdt_idr/ticker` | Ticker USDT/IDR |
| Indodax | `https://indodax.com/api/usdt_idr/depth` | Orderbook depth |
| Tokocrypto | `https://www.tokocrypto.com/open/v1/market/ticker?symbol=USDTIDR` | Ticker |
| Tokocrypto | `https://www.tokocrypto.com/open/v1/market/depth?symbol=USDTIDR` | Depth |
| Exchange Rate | `https://api.exchangerate-api.com/v4/latest/USD` | USD/IDR estimasi |

---

## 🔄 Auto-Refresh

Data diperbarui otomatis setiap **5 menit**. Bisa diubah di:

```javascript
countdownSec = 300;  // ubah ke detik yang diinginkan (mis: 60 = 1 menit)
```

---

## 📦 Fitur

- ✅ Live orderbook USDT/IDR dari Reku (Top 10 bid & ask)
- ✅ BCA e-Rate USD/IDR (via estimasi / Worker scrape)
- ✅ Simulasi beli USDT (harga bersih)
- ✅ Perbandingan fee Indodax / Tokocrypto / Reku
- ✅ Metrik: Price Impact, VWAP, Spread, Mid Price
- ✅ Multi-exchange comparison (Reku, Indodax, Tokocrypto)
- ✅ Dark mode / Light mode
- ✅ Auto-refresh setiap 5 menit
- ✅ Depth visualization (bar)

---

## 📝 Notes

- **CORS**: Semua API exchange memiliki CORS restriction. Wajib gunakan proxy (Worker atau corsproxy.io) untuk akses dari browser.
- **Rate Limit**: Reku API limit tidak resmi terdokumentasi, gunakan interval minimal 30 detik.
- **Pintu Pro**: Tidak memiliki public API, hanya via app atau partner API.
