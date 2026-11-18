import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  MessageFlags
} from 'discord.js';
import { config } from './config.js';
import * as ltcCmd from './commands/ltc.js';
import * as chartCmd from './commands/chart.js';
import * as convertCmd from './commands/convert.js';
import * as signalCmd from './commands/signal.js';
import * as alertCmd from './commands/alert.js';
import * as helpCmd from './commands/help.js';
import { buildLtcMessage, registerPermanentLiveTracker, restoreLiveTrackers } from './commands/ltc.js';
import { buildSignalMessage } from './commands/signal.js';
import { toggleSignalAlert } from './services/alertService.js';
import { handleOwnerCommand } from './ownerCommands/index.js';
import { startStatusTracker } from './tracker.js';

// Configuration check
if (!config.discordToken) {
  console.error('\n❌ ERROR: Discord bot token not found!');
  console.error('👉 Please open .env and provide your DISCORD_TOKEN.\n');
  process.exit(1);
}

// Initialize Discord Client with message and guild intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Command Collection
client.commands = new Collection();
const commandModules = [ltcCmd, chartCmd, convertCmd, signalCmd, alertCmd, helpCmd];

for (const module of commandModules) {
  if (module.data && module.data.name) {
    client.commands.set(module.data.name, module);
  }
}

// Event: Client Ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log('----------------------------------------------------');
  console.log(`🤖 LTC Discord Bot connected as: ${readyClient.user.tag}`);
  console.log(`📊 Live Litecoin price tracking active`);
  console.log(`🎯 Technical Buy/Sell Signals & Mentions active`);
  console.log(`👑 Owner Commands enabled for ID: ${config.ownerId} (Prefix: ${config.prefix})`);
  console.log(`⏱️ Status update interval: ${config.statusUpdateInterval}s`);
  console.log('----------------------------------------------------');

  // Start presence and alert checking loop
  startStatusTracker(client);

  // Restore and resume all permanent live LTC trackers across restarts
  await restoreLiveTrackers(client);
});

// Event: Owner Prefix Messages Handling
client.on(Events.MessageCreate, async (message) => {
  await handleOwnerCommand(message, client);
});

// Event: Interaction Handling (Slash Commands & Buttons)
client.on(Events.InteractionCreate, async (interaction) => {
  // 1. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing /${interaction.commandName}:`, error);
      const errorMsg = {
        content: '❌ An error occurred while executing this command.',
        flags: MessageFlags.Ephemeral
      };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    }
    return;
  }

  // 2. Handle Interactive Buttons
  if (interaction.isButton()) {
    const customId = interaction.customId;

    try {
      // Button: Rules Acceptance
      if (customId === 'rules_understood') {
        await interaction.reply({
          content: `✅ Thank you <@${interaction.user.id}>! You have read and agreed to the server rules. Welcome to the community! 🎉`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Button: View Buy/Sell Signals from /ltc
      if (customId === 'btn_view_signals') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const signalPayload = await buildSignalMessage(interaction.user.id, interaction.channelId);
        await interaction.editReply(signalPayload);
        return;
      }

      // Button: Toggle Signal Alerts Subscription
      if (customId.startsWith('toggle_signal_alert_')) {
        const newState = toggleSignalAlert(interaction.user.id, interaction.channelId, interaction.guildId);

        // Update the signal message view
        const updatedSignalPayload = await buildSignalMessage(interaction.user.id, interaction.channelId);
        await interaction.update(updatedSignalPayload);

        await interaction.followUp({
          content: newState
            ? `✅ **Subscribed!** You will be mentioned (<@${interaction.user.id}>) in <#${interaction.channelId}> when strong Buy 🚀 or Sell ⚠️ signals occur.`
            : `🔕 **Unsubscribed.** You will no longer receive signal mentions.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Button: Refresh Signal View
      if (customId === 'refresh_signal_view') {
        await interaction.deferUpdate();
        const updatedSignalPayload = await buildSignalMessage(interaction.user.id, interaction.channelId);
        await interaction.editReply(updatedSignalPayload);
        return;
      }

      // Timeframe buttons: "tf_24h_USD", "tf_7d_EUR", etc.
      if (customId.startsWith('tf_')) {
        await interaction.deferUpdate();
        const parts = customId.split('_');
        const timeframe = parts[1]; // '24h', '7d', '30d', '1y'
        const currency = parts[2] || 'USD';

        const updatedPayload = await buildLtcMessage(timeframe, currency);
        await interaction.editReply(updatedPayload);

        // Ensure permanent live refresh continues on the message
        if (interaction.message) {
          registerPermanentLiveTracker(interaction.message, timeframe, currency);
        }
      }
      // Refresh button: "refresh_24h_USD"
      else if (customId.startsWith('refresh_')) {
        await interaction.deferUpdate();
        const parts = customId.split('_');
        const timeframe = parts[1] || '24h';
        const currency = parts[2] || 'USD';

        const updatedPayload = await buildLtcMessage(timeframe, currency);
        await interaction.editReply(updatedPayload);

        // Restart permanent timer on the message
        if (interaction.message) {
          registerPermanentLiveTracker(interaction.message, timeframe, currency);
        }
      }
      // Currency toggle button: "curr_24h_EUR"
      else if (customId.startsWith('curr_')) {
        await interaction.deferUpdate();
        const parts = customId.split('_');
        const timeframe = parts[1] || '24h';
        const currency = parts[2] || 'USD';

        const updatedPayload = await buildLtcMessage(timeframe, currency);
        await interaction.editReply(updatedPayload);

        // Continue permanent live tracker with new currency
        if (interaction.message) {
          registerPermanentLiveTracker(interaction.message, timeframe, currency);
        }
      }
    } catch (btnError) {
      console.error('Button interaction error:', btnError);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '⚠️ Unable to process button action.',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
});

// Log in to Discord
client.login(config.discordToken).catch((err) => {
  console.error('❌ Failed to connect to Discord:', err.message);
  console.error('👉 Please verify your DISCORD_TOKEN in the .env file.');
});
