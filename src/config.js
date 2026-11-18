import 'dotenv/config';

export const config = {
  discordToken: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || '',
  ownerId: process.env.OWNER_ID || '1531084611495530506',
  prefix: process.env.PREFIX || '!',
  defaultCurrency: (process.env.DEFAULT_CURRENCY || 'USD').toUpperCase(),
  statusUpdateInterval: Math.max(30, parseInt(process.env.STATUS_UPDATE_INTERVAL, 10) || 60),
  
  // Couleurs de la charte graphique Litecoin & Crypto
  colors: {
    litecoinBlue: 0x345D9D,
    litecoinSilver: 0xA6A9AA,
    bullishGreen: 0x00C087,
    bearishRed: 0xFF3B30,
    darkCard: 0x1A1E29,
    gold: 0xF1C40F
  },
  
  // Emojis d'état
  emojis: {
    ltc: '🪙',
    up: '📈',
    down: '📉',
    chart: '📊',
    fire: '🔥',
    exchange: '💱',
    shield: '🛡️',
    clock: '⏱️',
    target: '🎯',
    crown: '👑'
  }
};
