import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import * as ltcCmd from './commands/ltc.js';
import * as chartCmd from './commands/chart.js';
import * as convertCmd from './commands/convert.js';
import * as signalCmd from './commands/signal.js';
import * as alertCmd from './commands/alert.js';
import * as helpCmd from './commands/help.js';

const commands = [
  ltcCmd.data.toJSON(),
  chartCmd.data.toJSON(),
  convertCmd.data.toJSON(),
  signalCmd.data.toJSON(),
  alertCmd.data.toJSON(),
  helpCmd.data.toJSON()
];

if (!config.discordToken || !config.clientId) {
  console.error('❌ ERROR: DISCORD_TOKEN or CLIENT_ID is missing in the .env file!');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.discordToken);

async function deploy() {
  try {
    console.log(`🚀 Starting registration of ${commands.length} slash commands...`);

    if (config.guildId) {
      // Instant deployment to a specific guild
      console.log(`📌 Registering commands to Guild (Guild ID: ${config.guildId})...`);
      const data = await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${data.length} commands to guild!`);
    } else {
      // Global deployment
      console.log(`🌐 Registering commands globally (all servers)...`);
      const data = await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commands }
      );
      console.log(`✅ Successfully registered ${data.length} commands globally!`);
    }
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
}

deploy();
