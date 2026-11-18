import axios from 'axios';

export function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses -= diff;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export function calculateEMA(prices, period) {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

export async function getTradingSignals() {
  try {
    const response = await axios.get(
      'https://api.binance.com/api/v3/klines?symbol=LTCUSDT&interval=1h&limit=100',
      { timeout: 8000 }
    );

    const klines = response.data;
    const closes = klines.map((k) => parseFloat(k[4]));
    const highs = klines.map((k) => parseFloat(k[2]));
    const lows = klines.map((k) => parseFloat(k[3]));
    const currentPrice = closes[closes.length - 1];

    const rsi = calculateRSI(closes, 14);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);

    const recentHigh = Math.max(...highs.slice(-24));
    const recentLow = Math.min(...lows.slice(-24));
    const pivot = (recentHigh + recentLow + currentPrice) / 3;
    const resistance1 = 2 * pivot - recentLow;
    const support1 = 2 * pivot - recentHigh;
    const resistance2 = pivot + (recentHigh - recentLow);
    const support2 = pivot - (recentHigh - recentLow);

    let score = 0;
    let rsiStatus = 'Neutral';

    if (rsi <= 30) {
      score += 2;
      rsiStatus = 'Oversold (Survente - Strong Buy Zone)';
    } else if (rsi <= 42) {
      score += 1;
      rsiStatus = 'Accumulation Zone (Good Entry)';
    } else if (rsi >= 70) {
      score -= 2;
      rsiStatus = 'Overbought (Surachat - Strong Sell Zone)';
    } else if (rsi >= 58) {
      score -= 1;
      rsiStatus = 'Distribution Zone (Take Profit)';
    }

    let trend = 'Neutral';
    if (currentPrice > ema20 && ema20 > ema50) {
      score += 1;
      trend = 'Bullish Trend 🟢 (Price > EMA20 > EMA50)';
    } else if (currentPrice < ema20 && ema20 < ema50) {
      score -= 1;
      trend = 'Bearish Trend 🔴 (Price < EMA20 < EMA50)';
    } else {
      trend = 'Consolidation / Range 🟡';
    }

    let signal = 'HOLD';
    let signalEmoji = '🟡';
    let advice = 'The market is currently consolidating. Wait for clearer volume or a breakout confirmation.';
    let color = 0xF5A623;
    let actionType = 'NEUTRAL';

    if (score >= 2) {
      signal = 'STRONG BUY';
      signalEmoji = '🚀';
      advice = 'Ideal time to buy or accumulate! Indicators show oversold conditions with attractive upside potential.';
      color = 0x00F59B;
      actionType = 'STRONG_BUY';
    } else if (score === 1) {
      signal = 'BUY (ACCUMULATE)';
      signalEmoji = '🟢';
      advice = 'Favorable risk/reward entry point. Consider scaling in with a staggered buy order.';
      color = 0x00E676;
      actionType = 'BUY';
    } else if (score <= -2) {
      signal = 'STRONG SELL (TAKE PROFIT)';
      signalEmoji = '⚠️';
      advice = 'High risk of short-term pullback! Great moment to take profits or set stop-losses.';
      color = 0xFF3B30;
      actionType = 'STRONG_SELL';
    } else if (score === -1) {
      signal = 'SELL / REDUCE';
      signalEmoji = '🔴';
      advice = 'Upward momentum is weakening. Good zone to take partial profits or protect your capital.';
      color = 0xFF6B6B;
      actionType = 'SELL';
    }

    const stopLoss = (currentPrice * 0.96).toFixed(2);
    const targetTakeProfit1 = (currentPrice * 1.05).toFixed(2);
    const targetTakeProfit2 = (currentPrice * 1.10).toFixed(2);

    return {
      currentPrice,
      rsi: parseFloat(rsi.toFixed(2)),
      rsiStatus,
      ema20: parseFloat(ema20.toFixed(2)),
      ema50: parseFloat(ema50.toFixed(2)),
      trend,
      signal,
      signalEmoji,
      score,
      actionType,
      advice,
      color,
      levels: {
        support1: parseFloat(support1.toFixed(2)),
        support2: parseFloat(support2.toFixed(2)),
        resistance1: parseFloat(resistance1.toFixed(2)),
        resistance2: parseFloat(resistance2.toFixed(2))
      },
      targets: {
        stopLoss,
        takeProfit1: targetTakeProfit1,
        takeProfit2: targetTakeProfit2
      },
      timestamp: new Date()
    };
  } catch (err) {
    console.error('Error computing trading signals:', err.message);
    throw err;
  }
}
