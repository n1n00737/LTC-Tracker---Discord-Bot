import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getLtcMarketData, getLtcHistoricalPrices } from '../services/cryptoService.js';
import { generateLtcChart } from '../services/chartService.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('ltc')
  .setDescription('Displays real-time Litecoin (LTC) price, chart, and market analysis with permanent live auto-refresh')
  .addStringOption((option) =>
    option
      .setName('timeframe')
      .setDescription('Chart timeframe')
      .setRequired(false)
      .addChoices(
        { name: '⏱️ 24 Hours (1D)', value: '24h' },
        { name: '📅 7 Days (7D)', value: '7d' },
        { name: '🗓️ 30 Days (1M)', value: '30d' },
        { name: '📊 1 Year (1Y)', value: '1y' }
      )
  )
  .addStringOption((option) =>
    option
      .setName('currency')
      .setDescription('Display currency (USD or EUR)')
      .setRequired(false)
      .addChoices(
        { name: '💵 USD ($)', value: 'USD' },
        { name: '💶 EUR (€)', value: 'EUR' }
      )
  );

/**
 * Creates a visual range bar for the 24h low/high position
 */
function createRangeBar(current, low, high, length = 14) {
  if (high <= low) return '──●───────────';
  const ratio = Math.max(0, Math.min(1, (current - low) / (high - low)));
  const pos = Math.round(ratio * (length - 1));
  const chars = Array(length).fill('─');
  chars[pos] = '🟢';
  return chars.join('');
}

import {
  registerPermanentLiveTracker,
  activeLiveTrackers,
  restoreLiveTrackers
} from '../services/liveTrackerService.js';

export { registerPermanentLiveTracker, activeLiveTrackers, restoreLiveTrackers };

const REFRESH_INTERVAL_SECONDS = 30; // Updates every 30 seconds

/**
 * Builds the premium LTC embed and optional interactive components
 * @param {string} timeframe
 * @param {string} currency
 * @param {boolean} withButtons If false, only the embed is returned without action buttons
 */
export async function buildLtcMessage(timeframe = '24h', currency = 'USD', withButtons = true) {
  const [marketData, historyData] = await Promise.all([
    getLtcMarketData(),
    getLtcHistoricalPrices(timeframe)
  ]);

  const { attachment, filename } = await generateLtcChart(historyData, currency);

  const price = currency === 'EUR' ? marketData.price.eur : marketData.price.usd;
  const currSymbol = currency === 'EUR' ? '€' : '$';
  const isUp = marketData.isBullish;
  const change24h = marketData.stats24h.changePercent;
  const changeAbs = marketData.stats24h.changeAbsolute;
  const trendBadge = isUp ? '🟢 +' : '🔴 ';
  const sign = isUp ? '+' : '';

  const fmt = (num, digits = 2) =>
    num.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

  const embedColor = isUp ? 0x00E676 : 0xFF3B30;

  // 24h range bar
  const rangeBar = createRangeBar(price, marketData.stats24h.low, marketData.stats24h.high);

  // Mined supply percentage (Circulating supply / 84M)
  const supplyPercent = ((marketData.extra.circulatingSupply / 84_000_000) * 100).toFixed(1);

  // Dynamic next refresh countdown timestamp
  const nextRefreshUnix = Math.floor((Date.now() + REFRESH_INTERVAL_SECONDS * 1000) / 1000);

  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'Litecoin Network • Real-time Live Market Overview',
      iconURL: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
      url: 'https://litecoin.org/'
    })
    .setColor(embedColor)
    .setDescription(
      `## 🪙 **${currSymbol}${fmt(price)}** \`[${trendBadge}${fmt(Math.abs(change24h))}%]\`\n` +
      `> ⏱️ **Auto-Refresh :** <t:${nextRefreshUnix}:R> \`(${REFRESH_INTERVAL_SECONDS}s)\` • **24h Change :** \`${sign}${currSymbol}${fmt(changeAbs)}\`\n` +
      `\n` +
      `**📊 24H Price Range**\n` +
      `\`${currSymbol}${fmt(marketData.stats24h.low)}\` ${rangeBar} \`${currSymbol}${fmt(marketData.stats24h.high)}\``
    )
    .addFields(
      {
        name: '⏱️ Price Performance',
        value: 
          `**1H :** \`${marketData.extra.change1h >= 0 ? '+' : ''}${fmt(marketData.extra.change1h)}%\`\n` +
          `**24H :** \`${sign}${fmt(change24h)}%\`\n` +
          `**7D :** \`${marketData.extra.change7d >= 0 ? '+' : ''}${fmt(marketData.extra.change7d)}%\`\n` +
          `**30D :** \`${marketData.extra.change30d >= 0 ? '+' : ''}${fmt(marketData.extra.change30d)}%\``,
        inline: true
      },
      {
        name: '🏆 Market & Ranking',
        value: 
          `**Rank :** \`#${marketData.extra.marketCapRank}\` worldwide\n` +
          `**Market Cap :** \`$${fmt(marketData.extra.marketCapUsd / 1_000_000_000, 2)}B\`\n` +
          `**Vol / Cap :** \`${((marketData.stats24h.volumeUsd / (marketData.extra.marketCapUsd || 1)) * 100).toFixed(2)}%\`\n` +
          `**Volume :** \`${fmt(marketData.stats24h.volumeLtc, 0)} LTC\``,
        inline: true
      },
      {
        name: '🪙 Supply & All-Time High',
        value: 
          `**Circulating :** \`${fmt(marketData.extra.circulatingSupply / 1_000_000, 1)}M\` *(${supplyPercent}% mined)*\n` +
          `**Max Supply :** \`84,000,000 LTC\`\n` +
          `**ATH (Record) :** \`$${fmt(marketData.extra.athUsd)}\`\n` +
          `**ATH Date :** *${marketData.extra.athDate}*`,
        inline: true
      }
    )
    .setImage(`attachment://${filename}`)
    .setFooter({
      text: `⚡ Live Auto-Refresh Active (Every ${REFRESH_INTERVAL_SECONDS}s) • Timeframe: ${timeframe.toUpperCase()}`,
      iconURL: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png'
    })
    .setTimestamp(marketData.timestamp);

  // If buttons are disabled (e.g. for !ltc-live)
  if (!withButtons) {
    return {
      embeds: [embed],
      files: [attachment],
      components: []
    };
  }

  // Row 1: Timeframe buttons
  const timeframeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tf_24h_${currency}`)
      .setLabel('24H')
      .setEmoji('⏱️')
      .setStyle(timeframe === '24h' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tf_7d_${currency}`)
      .setLabel('7 Days')
      .setEmoji('📅')
      .setStyle(timeframe === '7d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tf_30d_${currency}`)
      .setLabel('30 Days')
      .setEmoji('🗓️')
      .setStyle(timeframe === '30d' ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tf_1y_${currency}`)
      .setLabel('1 Year')
      .setEmoji('📊')
      .setStyle(timeframe === '1y' ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  // Row 2: Actions (Refresh, Signals, Switch Currency, Links)
  const nextCurrency = currency === 'USD' ? 'EUR' : 'USD';
  const nextCurrEmoji = currency === 'USD' ? '💶' : '💵';
  
  const actionsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`refresh_${timeframe}_${currency}`)
      .setLabel('Refresh Now')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('btn_view_signals')
      .setLabel('Buy/Sell Signal')
      .setEmoji('🎯')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`curr_${timeframe}_${nextCurrency}`)
      .setLabel(`Switch to ${nextCurrency}`)
      .setEmoji(nextCurrEmoji)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('TradingView')
      .setEmoji('📈')
      .setURL('https://www.tradingview.com/symbols/LTCUSDT/')
      .setStyle(ButtonStyle.Link)
  );

  return {
    embeds: [embed],
    files: [attachment],
    components: [timeframeRow, actionsRow]
  };
}


export async function execute(interaction) {
  await interaction.deferReply();

  const timeframe = interaction.options.getString('timeframe') || '24h';
  const currency = interaction.options.getString('currency') || config.defaultCurrency;

  try {
    const messagePayload = await buildLtcMessage(timeframe, currency, true);
    const replyResponse = await interaction.editReply(messagePayload);

    // Fetch the underlying Message object for permanent updates
    const message = await interaction.fetchReply().catch(() => replyResponse);
    if (message) {
      registerPermanentLiveTracker(message, timeframe, currency, true);
    }
  } catch (error) {
    console.error('Error executing /ltc command:', error);
    await interaction.editReply({
      content: `❌ An error occurred while retrieving market data: ${error.message}`
    });
  }
}
