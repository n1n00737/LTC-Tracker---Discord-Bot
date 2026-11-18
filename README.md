# 🪙 Litecoin (LTC) Discord Bot • Real-time Tracker & Smart Trading Signals

> A modern, responsive, and full-featured Discord bot written in **JavaScript (Node.js & Discord.js v14)** to track live **Litecoin (LTC)** prices, generate financial technical charts, convert currencies, and deliver **automated Buy/Sell signal notifications with user mentions**, plus a suite of **Owner-exclusive administration prefix commands**.

---

## 🌟 Key Features

### 🎯 1. Smart Buy & Sell Signals & Mentions (`/signal` & `/alert`)
- **Real-Time Technical Indicators**:
  - **RSI (14)** Momentum Oscillator with visual progress gauge.
  - **EMA (20 / 50)** Trend Moving Averages.
  - **Support & Resistance** Pivot Levels (S1, S2, R1, R2).
  - **Target Take-Profit (TP1 +5%, TP2 +10%) & Stop-Loss (-4%)** price projections.
- **Automated Discord Mentions (`<@userId>`)**:
  - Automatically pings subscribed users when a strong **Buy 🚀** or **Sell ⚠️** opportunity is detected.

---

### 👑 2. Owner-Exclusive Prefix Commands (Admin Suite)
Reserved strictly for the configured `OWNER_ID`:
- `!rules` / `!reglement` : Posts an official, styled Server Rules embed with a verification button.
- `!say <message>` : Makes the bot speak in the channel (auto-deletes your command).
- `!embed <Title> | <Description> | [#Color]` : Creates and broadcasts a custom embed.
- `!announce <#channel> <message>` : Posts an official formatted announcement.
- `!ltc-live [#channel]` : Posts a permanently live auto-refreshing LTC tracker in any channel.
- `!clear <1-100>` : Bulk deletes recent messages in the channel.
- `!botstats` : Displays real-time memory usage, ping, uptime, and server count.
- `!ownerhelp` : Shows the owner commands cheatsheet.

---

### 📈 3. High-Resolution Dynamic Charts (TradingView Dark Theme)
- **Instant Rendering**: Server-side chart generation using QuickChart / Chart.js attached directly to Discord messages.
- **4 Supported Timeframes**: `24H`, `7 Days`, `30 Days`, `1 Year`.

---

### 💎 4. Full Market Metrics & Rich Embeds (`/ltc`)
- Live Prices in USD ($) and EUR (€).
- Dynamic 24H Price Range Bar.
- Multi-timeframe variations (1H, 24H, 7D, 30D).
- Volume, Market Cap Rank, ATH (All-Time High), and Circulating Supply.
- **Permanent Live Auto-Refresh** every 30 seconds with Discord dynamic countdown timestamp `<t:timestamp:R>`.

---

## 📋 Slash Commands List (For All Users)

| Command | Description |
| :--- | :--- |
| **`/ltc`** | Full market overview with live price, chart, 24h range, and interactive buttons. |
| **`/signal`** | Technical analysis with RSI meter, EMA trend, price targets (TP1/TP2/SL), and notification toggle. |
| **`/alert signal`** | Subscribe/unsubscribe to `@mention` alerts for Buy/Sell signals. |
| **`/alert price`** | Set a custom price alert that mentions you when reached. |
| **`/alert list`** | List active price and signal alerts. |
| **`/alert clear`** | Delete all configured alerts. |
| **`/chart`** | Standalone high-definition price chart across multiple timeframes. |
| **`/convert`** | Instant currency converter between LTC, USD, EUR, and BTC. |
| **`/help`** | Command user guide and tutorial. |

---

## 👑 Owner Prefix Commands (Prefix: `!`)

| Command | Description | Example |
| :--- | :--- | :--- |
| **`!rules`** / **`!reglement`** | Posts the complete server rules card with an accept button | `!rules` |
| **`!say <text>`** | Sends a message from the bot | `!say Welcome to our server!` |
| **`!embed <T> \| <D> \| [C]`** | Sends a custom rich embed | `!embed Info \| Welcome everyone! \| #345D9D` |
| **`!announce <#ch> <text>`** | Sends a highlighted announcement embed | `!announce #news Bot is now online!` |
| **`!ltc-live [#ch]`** | Spawns a permanent live auto-refreshing tracker | `!ltc-live #crypto-tracker` |
| **`!clear <1-100>`** | Purges messages in the current channel | `!clear 10` |
| **`!botstats`** | Displays bot uptime, memory, servers, and ping | `!botstats` |
| **`!ownerhelp`** | Displays the owner admin help panel | `!ownerhelp` |

---

## ⚙️ Configuration (`.env`)

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here

# Owner configuration
OWNER_ID=your_discord_user_id
PREFIX=!

GUILD_ID=
DEFAULT_CURRENCY=EUR
STATUS_UPDATE_INTERVAL=30
```

> ⚠️ **Note on Privileged Intents**: Make sure **Message Content Intent** is enabled under your bot settings in the [Discord Developer Portal](https://discord.com/developers/applications) (Bot tab ➔ Privileged Gateway Intents).

---

## 🚀 Installation & Running

```bash
npm install
npm run deploy
npm start
```
