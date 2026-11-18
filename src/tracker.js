import { ActivityType } from 'discord.js';
import { getLtcMarketData } from './services/cryptoService.js';
import { checkAndDispatchAlerts } from './services/alertService.js';
import { config } from './config.js';

let updateTimer = null;

/**
 * Starts automatic presence/status tracker and alert dispatcher for the Discord bot
 * @param {import('discord.js').Client} client
 */
export function startStatusTracker(client) {
  if (updateTimer) clearInterval(updateTimer);

  const updateLoop = async () => {
    try {
      // 1. Update Discord bot presence
      const data = await getLtcMarketData();
      const price = config.defaultCurrency === 'EUR' ? data.price.eur : data.price.usd;
      const symbol = config.defaultCurrency === 'EUR' ? '€' : '$';
      const change = data.stats24h.changePercent;
      const sign = change >= 0 ? '+' : '';
      const arrow = change >= 0 ? '↗' : '↘';

      // Example: LTC: $88.50 (+3.2% ↗)
      const statusText = `LTC: ${symbol}${price.toFixed(2)} (${sign}${change.toFixed(1)}% ${arrow})`;

      client.user.setPresence({
        activities: [
          {
            name: statusText,
            type: ActivityType.Custom,
            state: statusText
          }
        ],
        status: 'online'
      });

      // 2. Check and dispatch user alerts & buy/sell mentions
      await checkAndDispatchAlerts(client);
    } catch (err) {
      console.warn('[Tracker] Error in tracker update loop:', err.message);
    }
  };

  // Initial execution
  updateLoop();

  // Recurring execution
  updateTimer = setInterval(updateLoop, config.statusUpdateInterval * 1000);
}
