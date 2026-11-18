import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getLtcMarketData } from '../services/cryptoService.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('convert')
  .setDescription('Converts an amount between LTC and fiat/crypto currencies (USD, EUR, BTC)')
  .addNumberOption((option) =>
    option
      .setName('amount')
      .setDescription('The amount to convert')
      .setRequired(true)
      .setMinValue(0.00000001)
  )
  .addStringOption((option) =>
    option
      .setName('direction')
      .setDescription('Conversion direction')
      .setRequired(false)
      .addChoices(
        { name: 'LTC ➔ EUR / USD / BTC', value: 'LTC_TO_ALL' },
        { name: 'EUR ➔ LTC', value: 'EUR_TO_LTC' },
        { name: 'USD ➔ LTC', value: 'USD_TO_LTC' },
        { name: 'BTC ➔ LTC', value: 'BTC_TO_LTC' }
      )
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const amount = interaction.options.getNumber('amount');
  const direction = interaction.options.getString('direction') || 'LTC_TO_ALL';

  try {
    const marketData = await getLtcMarketData();
    const { usd, eur, btc } = marketData.price;

    const embed = new EmbedBuilder()
      .setColor(config.colors.litecoinBlue)
      .setThumbnail('https://assets.coingecko.com/coins/images/2/large/litecoin.png')
      .setFooter({ text: 'Live exchange rates via Binance' })
      .setTimestamp();

    const fmt = (val, dec = 2) =>
      val.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

    if (direction === 'LTC_TO_ALL') {
      const totalUsd = amount * usd;
      const totalEur = amount * eur;
      const totalBtc = btc ? amount * btc : null;

      embed.setTitle(`💱 Currency Conversion: ${amount} LTC`);
      embed.setDescription(
        `### **${amount} LTC** equals:\n\n` +
        `💶 **€${fmt(totalEur)} EUR**\n` +
        `💵 **$${fmt(totalUsd)} USD**\n` +
        (totalBtc ? `₿ **${totalBtc.toFixed(6)} BTC**\n` : '') +
        `\n*1 LTC = €${fmt(eur)} | $${fmt(usd)}*`
      );
    } else if (direction === 'EUR_TO_LTC') {
      const ltcAmount = amount / eur;
      embed.setTitle(`💱 Currency Conversion: €${fmt(amount)} EUR ➔ LTC`);
      embed.setDescription(
        `### **€${fmt(amount)} EUR** = **${ltcAmount.toFixed(4)} LTC**\n\n` +
        `*1 LTC = €${fmt(eur)} EUR*`
      );
    } else if (direction === 'USD_TO_LTC') {
      const ltcAmount = amount / usd;
      embed.setTitle(`💱 Currency Conversion: $${fmt(amount)} USD ➔ LTC`);
      embed.setDescription(
        `### **$${fmt(amount)} USD** = **${ltcAmount.toFixed(4)} LTC**\n\n` +
        `*1 LTC = $${fmt(usd)} USD*`
      );
    } else if (direction === 'BTC_TO_LTC') {
      const ltcAmount = btc ? amount / btc : 0;
      embed.setTitle(`💱 Currency Conversion: ${amount} BTC ➔ LTC`);
      embed.setDescription(
        `### **${amount} BTC** = **${ltcAmount.toFixed(4)} LTC**\n\n` +
        `*1 LTC = ${btc ? btc.toFixed(6) : 'N/A'} BTC*`
      );
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error executing /convert command:', error);
    await interaction.editReply({
      content: `❌ Conversion error: ${error.message}`
    });
  }
}
