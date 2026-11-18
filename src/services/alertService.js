import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EmbedBuilder } from 'discord.js';
import { getTradingSignals } from './technicalAnalysisService.js';
import { getLtcMarketData } from './cryptoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let alertsDb = {
  signalSubscribers: {},
  priceAlerts: []
};

try {
  if (fs.existsSync(ALERTS_FILE)) {
    const raw = fs.readFileSync(ALERTS_FILE, 'utf-8');
    alertsDb = JSON.parse(raw);
    if (!alertsDb.signalSubscribers) alertsDb.signalSubscribers = {};
    if (!alertsDb.priceAlerts) alertsDb.priceAlerts = [];
  } else {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alertsDb, null, 2));
  }
} catch (err) {
  console.error('Error loading alerts database:', err.message);
}

function saveDb() {
  try {
    fs.writeFileSync(ALERTS_FILE, JSON.stringify(alertsDb, null, 2));
  } catch (err) {
    console.error('Failed to save alerts.json:', err.message);
  }
}

export function toggleSignalAlert(userId, channelId, guildId, forceState = null) {
  const current = alertsDb.signalSubscribers[userId];
  const newState = forceState !== null ? forceState : !current?.enabled;

  if (newState) {
    alertsDb.signalSubscribers[userId] = {
      channelId,
      guildId: guildId || null,
      enabled: true,
      lastAlertTimestamp: 0,
      lastSignal: null
    };
  } else {
    if (alertsDb.signalSubscribers[userId]) {
      alertsDb.signalSubscribers[userId].enabled = false;
    }
  }

  saveDb();
  return newState;
}

export function addPriceAlert(userId, channelId, targetPrice, condition = 'above', currency = 'USD') {
  const id = `alert_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const alert = {
    id,
    userId,
    channelId,
    targetPrice: parseFloat(targetPrice),
    condition,
    currency: currency.toUpperCase(),
    createdAt: new Date().toISOString()
  };

  alertsDb.priceAlerts.push(alert);
  saveDb();
  return alert;
}

export function getUserAlerts(userId) {
  const isSignalEnabled = !!alertsDb.signalSubscribers[userId]?.enabled;
  const userPriceAlerts = alertsDb.priceAlerts.filter((a) => a.userId === userId);

  return {
    isSignalEnabled,
    signalChannelId: alertsDb.signalSubscribers[userId]?.channelId || null,
    priceAlerts: userPriceAlerts
  };
}

export function clearUserAlerts(userId) {
  if (alertsDb.signalSubscribers[userId]) {
    delete alertsDb.signalSubscribers[userId];
  }
  const beforeCount = alertsDb.priceAlerts.length;
  alertsDb.priceAlerts = alertsDb.priceAlerts.filter((a) => a.userId !== userId);
  saveDb();
  return beforeCount - alertsDb.priceAlerts.length;
}

export async function checkAndDispatchAlerts(client) {
  try {
    const [signals, marketData] = await Promise.all([
      getTradingSignals(),
      getLtcMarketData()
    ]);

    const now = Date.now();
    const SIGNAL_COOLDOWN_MS = 2 * 60 * 60 * 1000;

    if (signals.actionType === 'STRONG_BUY' || signals.actionType === 'BUY' || signals.actionType === 'STRONG_SELL' || signals.actionType === 'SELL') {
      for (const [userId, sub] of Object.entries(alertsDb.signalSubscribers)) {
        if (!sub.enabled) continue;

        const timePassed = now - (sub.lastAlertTimestamp || 0) > SIGNAL_COOLDOWN_MS;
        const signalChanged = sub.lastSignal !== signals.actionType;

        if (timePassed || signalChanged) {
          try {
            const channel = await client.channels.fetch(sub.channelId).catch(() => null);
            if (channel && channel.isTextBased()) {
              const isBuy = signals.actionType.includes('BUY');
              const alertTitle = isBuy
                ? `🚀 BUY OPPORTUNITY ALERT • Litecoin (LTC)`
                : `⚠️ TAKE PROFIT / SELL ALERT • Litecoin (LTC)`;

              const embed = new EmbedBuilder()
                .setTitle(alertTitle)
                .setColor(signals.color)
                .setThumbnail('https://assets.coingecko.com/coins/images/2/large/litecoin.png')
                .setDescription(
                  `### ${signals.signalEmoji} **Signal: ${signals.signal}**\n` +
                  `**Current Price:** \`$${signals.currentPrice.toFixed(2)} USD\` *(€${marketData.price.eur.toFixed(2)} EUR)*\n\n` +
                  `> 💡 **Strategy Advice:** ${signals.advice}\n`
                )
                .addFields(
                  {
                    name: '📊 Technical Indicators',
                    value: `**RSI (14):** \`${signals.rsi}\` (${signals.rsiStatus})\n**Trend:** ${signals.trend}\n**EMA 20:** \`$${signals.ema20}\` | **EMA 50:** \`$${signals.ema50}\``,
                    inline: false
                  },
                  {
                    name: '🎯 Price Targets & Risk Management',
                    value: `**Take Profit 1 (+5%):** \`$${signals.targets.takeProfit1}\`\n**Take Profit 2 (+10%):** \`$${signals.targets.takeProfit2}\`\n**Stop-Loss (-4%):** \`$${signals.targets.stopLoss}\``,
                    inline: true
                  },
                  {
                    name: '🛡️ Support & Resistance',
                    value: `**Support 1:** \`$${signals.levels.support1}\`\n**Resistance 1:** \`$${signals.levels.resistance1}\``,
                    inline: true
                  }
                )
                .setFooter({ text: 'LTC Smart Trading Signals • Real-time Notification' })
                .setTimestamp();

              await channel.send({
                content: `🔔 <@${userId}> — **New LTC Trading Signal Detected!**`,
                embeds: [embed]
              });

              sub.lastAlertTimestamp = now;
              sub.lastSignal = signals.actionType;
              saveDb();
            }
          } catch (sendErr) {
            console.warn(`Failed to dispatch signal alert to user ${userId}:`, sendErr.message);
          }
        }
      }
    }

    const remainingPriceAlerts = [];
    for (const alert of alertsDb.priceAlerts) {
      const currentPrice = alert.currency === 'EUR' ? marketData.price.eur : marketData.price.usd;
      const symbol = alert.currency === 'EUR' ? '€' : '$';
      let triggered = false;

      if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
        triggered = true;
      } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
        triggered = true;
      }

      if (triggered) {
        try {
          const channel = await client.channels.fetch(alert.channelId).catch(() => null);
          if (channel && channel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setTitle(`🎯 PRICE TARGET REACHED • Litecoin (LTC)`)
              .setColor(alert.condition === 'above' ? 0x00F59B : 0xFF3B30)
              .setDescription(
                `### 🪙 **Litecoin reached your target of ${symbol}${alert.targetPrice.toFixed(2)} ${alert.currency}!**\n\n` +
                `**Current Price:** \`${symbol}${currentPrice.toFixed(2)} ${alert.currency}\`\n` +
                `**Condition:** Price went \`${alert.condition.toUpperCase()}\` target.`
              )
              .setFooter({ text: 'LTC Price Alert System' })
              .setTimestamp();

            await channel.send({
              content: `🚨 <@${alert.userId}> — **Your LTC Price Alert has been triggered!**`,
              embeds: [embed]
            });
          }
        } catch (alertErr) {
          console.warn(`Failed to dispatch price alert ${alert.id}:`, alertErr.message);
        }
      } else {
        remainingPriceAlerts.push(alert);
      }
    }

    if (remainingPriceAlerts.length !== alertsDb.priceAlerts.length) {
      alertsDb.priceAlerts = remainingPriceAlerts;
      saveDb();
    }
  } catch (loopErr) {
    console.warn('Error during alert check loop:', loopErr.message);
  }
}
