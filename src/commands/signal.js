import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { getTradingSignals } from '../services/technicalAnalysisService.js';
import { getLtcMarketData } from '../services/cryptoService.js';
import { getUserAlerts } from '../services/alertService.js';

export const data = new SlashCommandBuilder()
  .setName('signal')
  .setDescription('Analyzes the best moment to buy or sell Litecoin (LTC) using technical indicators');

export async function buildSignalMessage(userId, channelId) {
  const [signals, marketData] = await Promise.all([
    getTradingSignals(),
    getLtcMarketData()
  ]);

  const userAlerts = getUserAlerts(userId);
  const isSubscribed = userAlerts.isSignalEnabled;

  const rsiValue = signals.rsi;
  const barLength = 16;
  const rsiPos = Math.min(barLength - 1, Math.max(0, Math.round((rsiValue / 100) * (barLength - 1))));
  const rsiBarChars = Array(barLength).fill('─');
  rsiBarChars[rsiPos] = '🟢';
  const rsiBar = rsiBarChars.join('');

  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'Litecoin (LTC) • Buy / Sell Technical Signals',
      iconURL: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png'
    })
    .setTitle(`${signals.signalEmoji} Overall Signal: **${signals.signal}**`)
    .setColor(signals.color)
    .setDescription(
      `### 🪙 **Price:** \`$${signals.currentPrice.toFixed(2)} USD\` *(€${marketData.price.eur.toFixed(2)} EUR)*\n` +
      `> 💡 **Strategy Advice:**\n> ${signals.advice}\n\n` +
      `**📊 RSI (14) Momentum Meter :** \`${signals.rsi}\`\n` +
      `\`0 (Oversold)\` ${rsiBar} \`100 (Overbought)\`\n` +
      `*Status: ${signals.rsiStatus}*`
    )
    .addFields(
      {
        name: '📈 Trend & Moving Averages',
        value: 
          `**Trend :** ${signals.trend}\n` +
          `**EMA (20) :** \`$${signals.ema20}\`\n` +
          `**EMA (50) :** \`$${signals.ema50}\``,
        inline: true
      },
      {
        name: '🎯 Price Targets & Risk Plan',
        value: 
          `**Take Profit 1 (+5%) :** \`$${signals.targets.takeProfit1}\`\n` +
          `**Take Profit 2 (+10%) :** \`$${signals.targets.takeProfit2}\`\n` +
          `**Stop-Loss (-4%) :** \`$${signals.targets.stopLoss}\``,
        inline: true
      },
      {
        name: '🛡️ Support & Resistance Levels',
        value: 
          `**Resistance 1 :** \`$${signals.levels.resistance1}\`\n` +
          `**Pivot Point :** \`$${((signals.levels.support1 + signals.levels.resistance1) / 2).toFixed(2)}\`\n` +
          `**Support 1 :** \`$${signals.levels.support1}\``,
        inline: false
      }
    )
    .setFooter({
      text: `Real-time Binance technical analysis • Updated`,
      iconURL: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png'
    })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`toggle_signal_alert_${userId}`)
      .setLabel(isSubscribed ? 'Disable Buy/Sell Mentions' : '🔔 Mention Me on Signals')
      .setEmoji(isSubscribed ? '🔕' : '🔔')
      .setStyle(isSubscribed ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('refresh_signal_view')
      .setLabel('Refresh Signal')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

export async function execute(interaction) {
  await interaction.deferReply();

  try {
    const payload = await buildSignalMessage(interaction.user.id, interaction.channelId);
    await interaction.editReply(payload);
  } catch (error) {
    console.error('Error in /signal command:', error);
    await interaction.editReply({
      content: `❌ Failed to compute trading signals: ${error.message}`
    });
  }
}
