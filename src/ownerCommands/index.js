import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} from 'discord.js';
import { config } from '../config.js';
import { buildLtcMessage, registerPermanentLiveTracker } from '../commands/ltc.js';

export async function handleOwnerCommand(message, client) {
  if (message.author.bot) return;

  const prefix = config.prefix || '!';

  if (!message.content.startsWith(prefix)) return;
  if (message.author.id !== config.ownerId) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  try {
    if (command === 'rules' || command === 'reglement' || command === 'règlement') {
      await message.delete().catch(() => {});

      const guildName = message.guild ? message.guild.name : 'Crypto Community';
      const guildIcon = message.guild ? message.guild.iconURL() : 'https://assets.coingecko.com/coins/images/2/large/litecoin.png';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${guildName} • Official Community Guidelines`,
          iconURL: guildIcon || 'https://assets.coingecko.com/coins/images/2/large/litecoin.png'
        })
        .setTitle('📜 Server Rules & Code of Conduct')
        .setColor(config.colors.litecoinBlue)
        .setDescription(
          `Welcome to **${guildName}**! To maintain a friendly, secure, and productive environment for all members, please carefully read and adhere to our server guidelines below.`
        )
        .addFields(
          {
            name: '🤝 1. Respect & Civil Conduct',
            value:
              '• Mutual respect, civility, and polite communication are strictly required at all times.\n' +
              '• Hate speech, harassment, toxic behavior, insults, defamation, or NSFW content will not be tolerated.'
          },
          {
            name: '🚫 2. No Spam & No Unauthorized Advertising',
            value:
              '• Spamming, message flooding, mass mentions, and duplicate posts are forbidden.\n' +
              '• Unsolicited direct message (DM) advertising, self-promotion, and unverified referral links are strictly prohibited.'
          },
          {
            name: '🛡️ 3. Security & Anti-Scam Policy',
            value:
              '• **Never share your Private Keys or Recovery Seed Phrases with anyone.**\n' +
              '• Staff members will **NEVER** DM you first asking for credentials, funds, or wallet connections.\n' +
              '• Report any suspicious DM or phishing attempt immediately to the moderation team.'
          },
          {
            name: '📊 4. Financial Disclaimer (DYOR)',
            value:
              '• All market prices, charts, and trading signals are provided for informational and educational purposes only.\n' +
              '• Nothing shared here constitutes financial advice. Always **Do Your Own Research (DYOR)** before making trading decisions.'
          },
          {
            name: '💬 5. Channel Etiquette',
            value:
              '• Please keep discussions, media, and bot commands in their respective designated channels.'
          }
        )
        .setFooter({
          text: `By participating in this server, you agree to abide by these rules • ${guildName} Team`,
          iconURL: guildIcon || 'https://assets.coingecko.com/coins/images/2/small/litecoin.png'
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rules_understood')
          .setLabel('I have read and agree to the rules')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success)
      );

      await message.channel.send({ embeds: [embed], components: [row] });
      return;
    }

    if (command === 'say' || command === 'dire') {
      const text = args.join(' ');
      if (!text) {
        const reply = await message.reply('⚠️ Veuillez fournir le texte à envoyer. Exemple : `!say Bonjour à tous !`');
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
      }

      await message.delete().catch(() => {});
      await message.channel.send(text);
      return;
    }

    if (command === 'embed') {
      const fullText = args.join(' ');
      const parts = fullText.split('|').map((p) => p.trim());

      if (parts.length < 2) {
        const reply = await message.reply(
          '⚠️ Format : `!embed Titre | Description | [Couleur hex ex: #345D9D]`'
        );
        setTimeout(() => reply.delete().catch(() => {}), 6000);
        return;
      }

      await message.delete().catch(() => {});

      const title = parts[0];
      const desc = parts[1];
      let colorHex = parts[2] ? parts[2].replace('#', '') : '345D9D';
      let color = parseInt(colorHex, 16) || config.colors.litecoinBlue;

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setColor(color)
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      return;
    }

    if (command === 'announce' || command === 'annonce') {
      const targetChannel = message.mentions.channels.first();
      if (!targetChannel) {
        const reply = await message.reply('⚠️ Veuillez mentionner un salon. Exemple : `!announce #annonces Message important`');
        setTimeout(() => reply.delete().catch(() => {}), 6000);
        return;
      }

      const announcementText = args.slice(1).join(' ');
      if (!announcementText) {
        const reply = await message.reply('⚠️ Veuillez fournir le message de l\'annonce.');
        setTimeout(() => reply.delete().catch(() => {}), 6000);
        return;
      }

      await message.delete().catch(() => {});

      const embed = new EmbedBuilder()
        .setAuthor({
          name: '📢 ANNONCE OFFICIELLE',
          iconURL: message.guild ? message.guild.iconURL() : undefined
        })
        .setColor(config.colors.gold)
        .setDescription(announcementText)
        .setFooter({ text: `Publié par l'administration • ${message.guild ? message.guild.name : ''}` })
        .setTimestamp();

      await targetChannel.send({ embeds: [embed] });
      return;
    }

    if (command === 'ltc-live' || command === 'post-tracker') {
      let targetChannel = message.mentions.channels.first() || message.channel;

      await message.delete().catch(() => {});

      const initialPayload = await buildLtcMessage('24h', config.defaultCurrency, false);
      const sentMessage = await targetChannel.send(initialPayload);

      registerPermanentLiveTracker(sentMessage, '24h', config.defaultCurrency, false);

      const confirm = await message.channel.send(`✅ Tracker live permanent LTC (Embed pur sans boutons) déployé dans <#${targetChannel.id}> !`);
      setTimeout(() => confirm.delete().catch(() => {}), 5000);
      return;
    }

    if (command === 'clear' || command === 'purge') {
      const count = parseInt(args[0], 10);
      if (isNaN(count) || count < 1 || count > 100) {
        const reply = await message.reply('⚠️ Veuillez spécifier un nombre de messages à supprimer entre 1 et 100.');
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
      }

      await message.delete().catch(() => {});
      const deleted = await message.channel.bulkDelete(count, true).catch((e) => {
        message.channel.send(`❌ Erreur suppression : ${e.message}`);
      });

      if (deleted) {
        const reply = await message.channel.send(`🗑️ **${deleted.size}** messages supprimés.`);
        setTimeout(() => reply.delete().catch(() => {}), 4000);
      }
      return;
    }

    if (command === 'botstats' || command === 'status' || command === 'stats') {
      const uptimeSec = Math.floor(process.uptime());
      const hours = Math.floor(uptimeSec / 3600);
      const minutes = Math.floor((uptimeSec % 3600) / 60);
      const seconds = uptimeSec % 60;
      const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

      const embed = new EmbedBuilder()
        .setTitle('👑 Panneau Owner • Statistiques du Bot LTC')
        .setColor(config.colors.gold)
        .addFields(
          { name: '⏱️ Uptime', value: `\`${hours}h ${minutes}m ${seconds}s\``, inline: true },
          { name: '💾 Mémoire Utilisée', value: `\`${memUsage} MB\``, inline: true },
          { name: '📶 Latence Ping', value: `\`${client.ws.ping} ms\``, inline: true },
          { name: '🌐 Serveurs Connectés', value: `\`${client.guilds.cache.size}\``, inline: true },
          { name: '👑 Owner ID', value: `\`${config.ownerId}\``, inline: true },
          { name: '⚡ Préfixe', value: `\`${config.prefix}\``, inline: true }
        )
        .setFooter({ text: 'Accès réservé au Propriétaire' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }

    if (command === 'ownerhelp' || command === 'admin' || command === 'adminhelp') {
      const embed = new EmbedBuilder()
        .setTitle('👑 Commandes Exclusives Owner')
        .setColor(config.colors.gold)
        .setDescription(`Voici la liste des commandes avec préfixe réservées uniquement à <@${config.ownerId}> :`)
        .addFields(
          {
            name: `\`${prefix}rules\` ou \`${prefix}reglement\``,
            value: 'Publie le règlement officiel et stylisé du serveur dans le salon.'
          },
          {
            name: `\`${prefix}say <texte>\``,
            value: 'Fait parler le bot dans le salon (supprime votre commande).'
          },
          {
            name: `\`${prefix}embed <titre> | <description> | [#couleur]\``,
            value: 'Crée et envoie un embed personnalisé.'
          },
          {
            name: `\`${prefix}announce <#salon> <message>\``,
            value: 'Envoie une annonce encadrée dans le salon mentionné.'
          },
          {
            name: `\`${prefix}ltc-live [#salon]\``,
            value: 'Poste un tracker Litecoin en direct avec mise à jour permanente infinie.'
          },
          {
            name: `\`${prefix}clear <1-100>\``,
            value: 'Supprime un nombre donné de messages récents.'
          },
          {
            name: `\`${prefix}botstats\``,
            value: 'Affiche l\'utilisation mémoire, l\'uptime et les performances du bot.'
          }
        )
        .setFooter({ text: `Préfixe actuel : ${prefix}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      return;
    }
  } catch (err) {
    console.error(`Erreur commande owner (${command}):`, err);
    await message.channel.send(`❌ Erreur lors de l'exécution de \`${prefix}${command}\` : ${err.message}`).catch(() => {});
  }
}
