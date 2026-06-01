/**
 * Treasury Monitor - Cloudflare Worker
 * Proxy untuk semua API exchange (menghindari CORS)
 * Deploy ke: Cloudflare Workers
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// ─────────────────────────────────────────────
// ROUTING
// ─────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // GET /api/reku/bidask          → semua bid/ask Reku
      if (path === '/api/reku/bidask') {
        return await proxyJSON('https://api.reku.id/v2/bidask');
      }

      // GET /api/reku/coins           → daftar koin Reku
      if (path === '/api/reku/coins') {
        return await proxyJSON('https://api.reku.id/v2/coins');
      }

      // GET /api/reku/orderbook?id=XX → orderbook Reku by coin id
      if (path === '/api/reku/orderbook') {
        const id = url.searchParams.get('id') || '1';
        return await proxyJSON(`https://api.reku.id/v2/orderbookall?id=${id}`);
      }

      // GET /api/reku/price           → harga semua koin Reku
      if (path === '/api/reku/price') {
        return await proxyJSON('https://api.reku.id/v2/price');
      }

      // GET /api/indodax/ticker?pair=usdt_idr
      if (path === '/api/indodax/ticker') {
        const pair = url.searchParams.get('pair') || 'usdt_idr';
        return await proxyJSON(`https://indodax.com/api/${pair}/ticker`);
      }

      // GET /api/indodax/depth?pair=usdt_idr
      if (path === '/api/indodax/depth') {
        const pair = url.searchParams.get('pair') || 'usdt_idr';
        return await proxyJSON(`https://indodax.com/api/${pair}/depth`);
      }

      // GET /api/tokocrypto/depth?symbol=USDTIDR
      if (path === '/api/tokocrypto/depth') {
        const symbol = url.searchParams.get('symbol') || 'USDTIDR';
        return await proxyJSON(
          `https://www.tokocrypto.com/open/v1/market/depth?symbol=${symbol}&limit=40`
        );
      }

      // GET /api/tokocrypto/ticker?symbol=USDTIDR
      if (path === '/api/tokocrypto/ticker') {
        const symbol = url.searchParams.get('symbol') || 'USDTIDR';
        return await proxyJSON(
          `https://www.tokocrypto.com/open/v1/market/ticker?symbol=${symbol}`
        );
      }

      // GET /api/bca/erate            → kurs e-rate BCA USD/IDR
      if (path === '/api/bca/erate') {
        return await fetchBCARate();
      }

      // GET /api/all                  → semua data sekaligus (satu call dari frontend)
      if (path === '/api/all') {
        return await fetchAllData();
      }

      return jsonResponse({ error: 'Not found', path }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
async function proxyJSON(targetUrl) {
  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 TreasuryMonitor/1.0',
      Accept: 'application/json',
    },
    cf: { cacheTtl: 30, cacheEverything: false },
  });
  const data = await res.json();
  return jsonResponse(data);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

// BCA e-Rate: scrape dari endpoint publik BCA
async function fetchBCARate() {
  try {
    // BCA menyediakan data kurs via halaman web - kita fetch JSON dari endpoint tidak resmi
    // Alternatif: gunakan open-source scraper yang sudah ada
    const res = await fetch('https://www.bca.co.id/id/informasi/kurs', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const html = await res.text();

    // Parse HTML untuk extract e-rate USD
    const erateMatch = html.match(/E-Rate[\s\S]*?USD[\s\S]*?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/i);
    
    // Cari pattern kurs di HTML
    const usdBuyMatch = html.match(/(\d{2},\d{3}(?:\.\d+)?)/g);
    
    // Fallback: return struktur dengan data dummy jika scraping gagal
    return jsonResponse({
      source: 'BCA e-Rate',
      currency: 'USD/IDR',
      buy: null,
      sell: null,
      note: 'Fetch langsung dari BCA memerlukan server-side scraping. Gunakan proxy BCA terpisah.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return jsonResponse({ error: err.message, source: 'BCA e-Rate' }, 500);
  }
}

// Fetch semua data paralel
async function fetchAllData() {
  const results = await Promise.allSettled([
    fetch('https://api.reku.id/v2/bidask').then(r => r.json()),
    fetch('https://api.reku.id/v2/price').then(r => r.json()),
    fetch('https://indodax.com/api/usdt_idr/ticker').then(r => r.json()),
    fetch('https://indodax.com/api/usdt_idr/depth').then(r => r.json()),
    fetch('https://www.tokocrypto.com/open/v1/market/ticker?symbol=USDTIDR').then(r => r.json()),
    fetch('https://www.tokocrypto.com/open/v1/market/depth?symbol=USDTIDR&limit=20').then(r => r.json()),
  ]);

  const [rekuBidask, rekuPrice, indodaxTicker, indodaxDepth, tokoTicker, tokoDepth] = results.map(r =>
    r.status === 'fulfilled' ? r.value : { error: r.reason?.message }
  );

  return jsonResponse({
    reku: { bidask: rekuBidask, price: rekuPrice },
    indodax: { ticker: indodaxTicker, depth: indodaxDepth },
    tokocrypto: { ticker: tokoTicker, depth: tokoDepth },
    timestamp: new Date().toISOString(),
  });
}
