import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getLtcHistoricalPrices } from '../services/cryptoService.js';
import { generateLtcChart } from '../services/chartService.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('chart')
  .setDescription('Generates a high-resolution Litecoin (LTC) price chart')
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

export async function execute(interaction) {
  await interaction.deferReply();

  const timeframe = interaction.options.getString('timeframe') || '24h';
  const currency = interaction.options.getString('currency') || config.defaultCurrency;

  try {
    const historyData = await getLtcHistoricalPrices(timeframe);
    const { attachment, filename, isBullish } = await generateLtcChart(historyData, currency);

    const currSymbol = currency === 'EUR' ? '€' : '$';
    const embedColor = isBullish ? 0x00E676 : 0xFF3B30;
    const sign = historyData.changePercent >= 0 ? '+' : '';

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `Litecoin (LTC / ${currency}) • Technical Chart`,
        iconURL: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png'
      })
      .setColor(embedColor)
      .setDescription(
        `## 📈 **${currSymbol}${historyData.endPrice.toFixed(2)}** \`[${sign}${historyData.changePercent.toFixed(2)}%]\`\n` +
        `> **24h Low :** \`${currSymbol}${historyData.min.toFixed(2)}\` • **24h High :** \`${currSymbol}${historyData.max.toFixed(2)}\``
      )
      .setImage(`attachment://${filename}`)
      .setFooter({
        text: `Binance Market Data • Timeframe: ${timeframe.toUpperCase()}`,
        iconURL: 'https://assets.coingecko.com/coins/images/2/small/litecoin.png'
      })
      .setTimestamp();

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

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
      components: [timeframeRow]
    });
  } catch (error) {
    console.error('Error executing /chart command:', error);
    await interaction.editReply({
      content: `❌ Unable to generate price chart: ${error.message}`
    });
  }
}
