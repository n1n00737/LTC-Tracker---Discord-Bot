import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { toggleSignalAlert, addPriceAlert, getUserAlerts, clearUserAlerts } from '../services/alertService.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('alert')
  .setDescription('Manage your Litecoin (LTC) buy/sell signal and price alerts')
  .addSubcommand((sub) =>
    sub
      .setName('signal')
      .setDescription('Enable or disable automatic mentions when optimal Buy or Sell conditions occur')
      .addStringOption((opt) =>
        opt
          .setName('state')
          .setDescription('Enable or disable signal mentions')
          .setRequired(false)
          .addChoices(
            { name: '🔔 Enable (Mention me)', value: 'on' },
            { name: '🔕 Disable', value: 'off' }
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('price')
      .setDescription('Set a custom price alert that mentions you when reached')
      .addNumberOption((opt) =>
        opt
          .setName('target')
          .setDescription('Target price threshold')
          .setRequired(true)
          .setMinValue(0.01)
      )
      .addStringOption((opt) =>
        opt
          .setName('condition')
          .setDescription('Trigger when price goes above or below')
          .setRequired(false)
          .addChoices(
            { name: '📈 Goes Above (>= target)', value: 'above' },
            { name: '📉 Goes Below (<= target)', value: 'below' }
          )
      )
      .addStringOption((opt) =>
        opt
          .setName('currency')
          .setDescription('Currency (USD or EUR)')
          .setRequired(false)
          .addChoices(
            { name: '💵 USD ($)', value: 'USD' },
            { name: '💶 EUR (€)', value: 'EUR' }
          )
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('list')
      .setDescription('View all your active alerts and subscriptions')
  )
  .addSubcommand((sub) =>
    sub
      .setName('clear')
      .setDescription('Delete all your configured alerts')
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const userId = interaction.user.id;
  const channelId = interaction.channelId;
  const guildId = interaction.guildId;

  if (subcommand === 'signal') {
    const stateArg = interaction.options.getString('state');
    const forceState = stateArg === 'on' ? true : stateArg === 'off' ? false : null;
    const newState = toggleSignalAlert(userId, channelId, guildId, forceState);

    const embed = new EmbedBuilder()
      .setTitle(newState ? '🔔 Buy & Sell Signal Mentions: ENABLED' : '🔕 Buy & Sell Signal Mentions: DISABLED')
      .setColor(newState ? 0x00F59B : 0xFF3B30)
      .setDescription(
        newState
          ? `You will now be mentioned (**<@${userId}>**) in <#${channelId}> whenever the bot detects strong **BUY 🚀** (Oversold) or **SELL ⚠️** (Take Profit) opportunities!`
          : `You have unsubscribed from automated Buy/Sell signal notifications.`
      )
      .setFooter({ text: 'LTC Smart Alert System' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } else if (subcommand === 'price') {
    const target = interaction.options.getNumber('target');
    const condition = interaction.options.getString('condition') || 'above';
    const currency = interaction.options.getString('currency') || config.defaultCurrency;

    const alert = addPriceAlert(userId, channelId, target, condition, currency);
    const symbol = currency === 'EUR' ? '€' : '$';

    const embed = new EmbedBuilder()
      .setTitle('🎯 Price Alert Successfully Created')
      .setColor(0x345D9D)
      .setDescription(
        `I will mention you in this channel when Litecoin **${condition === 'above' ? 'rises above' : 'drops below'}** **${symbol}${target.toFixed(2)} ${currency}**!`
      )
      .setFooter({ text: `Alert ID: ${alert.id}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } else if (subcommand === 'list') {
    const userAlerts = getUserAlerts(userId);

    const embed = new EmbedBuilder()
      .setTitle(`📋 Your Active Litecoin Alerts`)
      .setColor(config.colors.litecoinBlue)
      .setDescription(
        `**🔔 Buy/Sell Signal Mentions:** ${userAlerts.isSignalEnabled ? `✅ Active in <#${userAlerts.signalChannelId}>` : '❌ Disabled'}\n\n` +
        `**🎯 Custom Price Alerts (${userAlerts.priceAlerts.length}):**\n` +
        (userAlerts.priceAlerts.length > 0
          ? userAlerts.priceAlerts
              .map(
                (a, i) =>
                  `\`${i + 1}.\` When price is **${a.condition.toUpperCase()}** \`${a.currency === 'EUR' ? '€' : '$'}${a.targetPrice.toFixed(2)} ${a.currency}\` (in <#${a.channelId}>)`
              )
              .join('\n')
          : '*No active price alerts.*')
      )
      .setFooter({ text: 'Use `/alert price` to add more or `/alert clear` to reset' });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  } else if (subcommand === 'clear') {
    const removedCount = clearUserAlerts(userId);

    const embed = new EmbedBuilder()
      .setTitle('🗑️ Alerts Cleared')
      .setColor(0xFF3B30)
      .setDescription(`All your signal subscriptions and **${removedCount}** price alert(s) have been deleted.`);

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}
