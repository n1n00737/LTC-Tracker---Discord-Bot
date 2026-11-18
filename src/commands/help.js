import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Displays the list of commands and features for the Litecoin (LTC) bot');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('🪙 Litecoin (LTC) Discord Bot • Command Guide')
    .setColor(config.colors.litecoinBlue)
    .setThumbnail('https://assets.coingecko.com/coins/images/2/large/litecoin.png')
    .setDescription(
      'Welcome to the official Litecoin price tracker for Discord! Track live market prices, analyze technical charts, get Buy/Sell signal mentions, and convert currencies seamlessly.'
    )
    .addFields(
      {
        name: '`/ltc [timeframe] [currency]`',
        value: 'Displays full Litecoin market dashboard with live prices, 24h range, ATH, performance metrics, chart, and quick Buy/Sell signal button.'
      },
      {
        name: '`/signal`',
        value: 'Analyzes optimal **Buy / Sell opportunities** using RSI momentum, EMA trends, support/resistance levels, and profit targets.'
      },
      {
        name: '`/alert signal [state]`',
        value: 'Subscribe or unsubscribe to **automatic Discord mentions** (`@you`) when a strong Buy 🚀 or Sell ⚠️ opportunity is detected.'
      },
      {
        name: '`/alert price <target> [condition] [currency]`',
        value: 'Sets a custom price alert that mentions you when LTC reaches your target threshold.'
      },
      {
        name: '`/alert list` | `/alert clear`',
        value: 'View or clear your active price and signal alerts.'
      },
      {
        name: '`/chart [timeframe] [currency]`',
        value: 'Generates a standalone high-definition chart across 24 hours, 7 days, 30 days, or 1 year.'
      },
      {
        name: '`/convert <amount> [direction]`',
        value: 'Instant currency converter between LTC and EUR, USD, BTC.'
      }
    )
    .setFooter({ text: 'Powered by Discord.js & QuickChart' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
