import axios from 'axios';

const cache = {
  priceData: null,
  priceDataTimestamp: 0,
  history: {},
  coingeckoData: null,
  coingeckoTimestamp: 0
};

const CACHE_DURATION_MS = 15000;
const COINGECKO_CACHE_MS = 120000;

export async function getLtcMarketData() {
  const now = Date.now();
  if (cache.priceData && now - cache.priceDataTimestamp < CACHE_DURATION_MS) {
    return cache.priceData;
  }

  try {
    const [tickerUsdtRes, tickerEurRes, tickerBtcRes] = await Promise.allSettled([
      axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=LTCUSDT', { timeout: 5000 }),
      axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=LTCEUR', { timeout: 5000 }),
      axios.get('https://api.binance.com/api/v3/ticker/24hr?symbol=LTCBTC', { timeout: 5000 })
    ]);

    const usdtData = tickerUsdtRes.status === 'fulfilled' ? tickerUsdtRes.value.data : null;
    const eurData = tickerEurRes.status === 'fulfilled' ? tickerEurRes.value.data : null;
    const btcData = tickerBtcRes.status === 'fulfilled' ? tickerBtcRes.value.data : null;

    if (!usdtData) {
      throw new Error('Unable to reach Binance price servers');
    }

    const priceUsd = parseFloat(usdtData.lastPrice);
    const priceEur = eurData ? parseFloat(eurData.lastPrice) : priceUsd * 0.92;
    const priceBtc = btcData ? parseFloat(btcData.lastPrice) : null;

    const change24hPercent = parseFloat(usdtData.priceChangePercent);
    const change24hAbsolute = parseFloat(usdtData.priceChange);
    const high24h = parseFloat(usdtData.highPrice);
    const low24h = parseFloat(usdtData.lowPrice);
    const volume24hLtc = parseFloat(usdtData.volume);
    const volume24hUsd = parseFloat(usdtData.quoteVolume);

    let extraData = await getCoinGeckoExtraData();

    const data = {
      price: {
        usd: priceUsd,
        eur: priceEur,
        btc: priceBtc
      },
      stats24h: {
        changePercent: change24hPercent,
        changeAbsolute: change24hAbsolute,
        high: high24h,
        low: low24h,
        volumeLtc: volume24hLtc,
        volumeUsd: volume24hUsd
      },
      extra: extraData,
      isBullish: change24hPercent >= 0,
      timestamp: new Date()
    };

    cache.priceData = data;
    cache.priceDataTimestamp = now;
    return data;
  } catch (error) {
    console.warn('⚠️ Binance API error, falling back to CoinGecko:', error.message);
    return await getCoinGeckoFallbackData();
  }
}

async function getCoinGeckoExtraData() {
  const now = Date.now();
  if (cache.coingeckoData && now - cache.coingeckoTimestamp < COINGECKO_CACHE_MS) {
    return cache.coingeckoData;
  }

  try {
    const res = await axios.get(
      'https://api.coingecko.com/api/v3/coins/litecoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false',
      { timeout: 6000 }
    );
    const md = res.data.market_data;
    const result = {
      marketCapRank: res.data.market_cap_rank || 15,
      marketCapUsd: md.market_cap?.usd || 0,
      marketCapEur: md.market_cap?.eur || 0,
      circulatingSupply: md.circulating_supply || 74000000,
      maxSupply: md.max_supply || 84000000,
      athUsd: md.ath?.usd || 410.26,
      athDate: md.ath_date?.usd ? new Date(md.ath_date.usd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'May 10, 2021',
      change1h: md.price_change_percentage_1h_in_currency?.usd || 0,
      change7d: md.price_change_percentage_7d || 0,
      change30d: md.price_change_percentage_30d || 0,
      change1y: md.price_change_percentage_1y || 0
    };

    cache.coingeckoData = result;
    cache.coingeckoTimestamp = now;
    return result;
  } catch (err) {
    console.warn('⚠️ CoinGecko extra data unavailable:', err.message);
    return cache.coingeckoData || {
      marketCapRank: 15,
      marketCapUsd: 0,
      marketCapEur: 0,
      circulatingSupply: 74000000,
      maxSupply: 84000000,
      athUsd: 410.26,
      athDate: 'May 10, 2021',
      change1h: 0,
      change7d: 0,
      change30d: 0,
      change1y: 0
    };
  }
}

async function getCoinGeckoFallbackData() {
  try {
    const res = await axios.get(
      'https://api.coingecko.com/api/v3/coins/litecoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false',
      { timeout: 8000 }
    );
    const md = res.data.market_data;
    const priceUsd = md.current_price.usd;
    const priceEur = md.current_price.eur;
    const priceBtc = md.current_price.btc;
    const change24hPercent = md.price_change_percentage_24h || 0;

    return {
      price: {
        usd: priceUsd,
        eur: priceEur,
        btc: priceBtc
      },
      stats24h: {
        changePercent: change24hPercent,
        changeAbsolute: (priceUsd * change24hPercent) / 100,
        high: md.high_24h?.usd || priceUsd,
        low: md.low_24h?.usd || priceUsd,
        volumeLtc: (md.total_volume?.usd || 0) / priceUsd,
        volumeUsd: md.total_volume?.usd || 0
      },
      extra: {
        marketCapRank: res.data.market_cap_rank || 15,
        marketCapUsd: md.market_cap?.usd || 0,
        marketCapEur: md.market_cap?.eur || 0,
        circulatingSupply: md.circulating_supply || 74000000,
        maxSupply: md.max_supply || 84000000,
        athUsd: md.ath?.usd || 410.26,
        athDate: md.ath_date?.usd ? new Date(md.ath_date.usd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'May 10, 2021',
        change1h: md.price_change_percentage_1h_in_currency?.usd || 0,
        change7d: md.price_change_percentage_7d || 0,
        change30d: md.price_change_percentage_30d || 0,
        change1y: md.price_change_percentage_1y || 0
      },
      isBullish: change24hPercent >= 0,
      timestamp: new Date()
    };
  } catch (e) {
    throw new Error(`All crypto data APIs failed: ${e.message}`);
  }
}

export async function getLtcHistoricalPrices(timeframe = '24h') {
  const cacheKey = `history_${timeframe}`;
  const now = Date.now();
  if (cache.history[cacheKey] && now - cache.history[cacheKey].timestamp < 60000) {
    return cache.history[cacheKey].data;
  }

  let interval = '15m';
  let limit = 96;
  let timeFormat = 'time';

  if (timeframe === '24h') {
    interval = '15m';
    limit = 96;
    timeFormat = 'time';
  } else if (timeframe === '7d') {
    interval = '2h';
    limit = 84;
    timeFormat = 'day_time';
  } else if (timeframe === '30d') {
    interval = '8h';
    limit = 90;
    timeFormat = 'date';
  } else if (timeframe === '1y') {
    interval = '3d';
    limit = 122;
    timeFormat = 'month_year';
  }

  try {
    const response = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=LTCUSDT&interval=${interval}&limit=${limit}`,
      { timeout: 8000 }
    );

    const rawKlines = response.data;
    const labels = [];
    const prices = [];

    rawKlines.forEach((k) => {
      const openTime = new Date(k[0]);
      const closePrice = parseFloat(k[4]);

      let label = '';
      if (timeFormat === 'time') {
        label = openTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      } else if (timeFormat === 'day_time') {
        label = `${openTime.toLocaleDateString('en-US', { weekday: 'short' })} ${openTime.getHours()}h`;
      } else if (timeFormat === 'date') {
        label = openTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        label = openTime.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }

      labels.push(label);
      prices.push(closePrice);
    });

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const changePercent = ((endPrice - startPrice) / startPrice) * 100;

    const result = {
      timeframe,
      labels,
      prices,
      min,
      max,
      startPrice,
      endPrice,
      changePercent,
      isBullish: changePercent >= 0
    };

    cache.history[cacheKey] = {
      timestamp: now,
      data: result
    };

    return result;
  } catch (error) {
    console.error(`Binance historical fetch error (${timeframe}):`, error.message);
    throw error;
  }
}
