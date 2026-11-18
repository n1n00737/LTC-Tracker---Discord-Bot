import { ActivityType } from 'discord.js';
import { getLtcMarketData } from './services/cryptoService.js';
import { checkAndDispatchAlerts } from './services/alertService.js';
import { config } from './config.js';

let updateTimer = null;

export function startStatusTracker(client) {
  if (updateTimer) clearInterval(updateTimer);

  const updateLoop = async () => {
    try {
      const data = await getLtcMarketData();
      const price = config.defaultCurrency === 'EUR' ? data.price.eur : data.price.usd;
      const symbol = config.defaultCurrency === 'EUR' ? '€' : '$';
      const change = data.stats24h.changePercent;
      const sign = change >= 0 ? '+' : '';
      const arrow = change >= 0 ? '↗' : '↘';

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

      await checkAndDispatchAlerts(client);
    } catch (err) {
      console.warn('[Tracker] Error in tracker update loop:', err.message);
    }
  };

  updateLoop();
  updateTimer = setInterval(updateLoop, config.statusUpdateInterval * 1000);
}
