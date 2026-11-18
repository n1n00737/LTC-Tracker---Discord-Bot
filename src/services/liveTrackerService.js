import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildLtcMessage } from '../commands/ltc.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const TRACKERS_FILE = path.join(DATA_DIR, 'liveTrackers.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory registry for active timer loops
// Key: messageId -> Value: { timer, timeframe, currency, withButtons, message }
export const activeLiveTrackers = new Map();

export const REFRESH_INTERVAL_SECONDS = 30; // Updates every 30 seconds

/**
 * Loads all saved trackers from disk
 * @returns {Record<string, { messageId: string, channelId: string, guildId?: string, timeframe: string, currency: string, withButtons: boolean, createdAt?: string, updatedAt?: string }>}
 */
function loadTrackersDb() {
  try {
    if (fs.existsSync(TRACKERS_FILE)) {
      const raw = fs.readFileSync(TRACKERS_FILE, 'utf-8');
      return JSON.parse(raw) || {};
    }
  } catch (err) {
    console.error('Error loading liveTrackers database:', err.message);
  }
  return {};
}

/**
 * Saves tracker map to disk
 * @param {Record<string, any>} db
 */
function saveTrackersDb(db) {
  try {
    fs.writeFileSync(TRACKERS_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Failed to save liveTrackers.json:', err.message);
  }
}

/**
 * Saves or updates a live tracker entry in persistent storage
 */
export function saveLiveTracker(tracker) {
  if (!tracker || !tracker.messageId) return;
  const db = loadTrackersDb();
  db[tracker.messageId] = {
    messageId: tracker.messageId,
    channelId: tracker.channelId,
    guildId: tracker.guildId || null,
    timeframe: tracker.timeframe || '24h',
    currency: tracker.currency || 'USD',
    withButtons: tracker.withButtons ?? false,
    createdAt: db[tracker.messageId]?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveTrackersDb(db);
}

/**
 * Removes a tracker from persistent storage and stops its timer
 */
export function removeLiveTracker(messageId) {
  if (!messageId) return;
  if (activeLiveTrackers.has(messageId)) {
    const existing = activeLiveTrackers.get(messageId);
    if (existing.timer) clearInterval(existing.timer);
    activeLiveTrackers.delete(messageId);
  }

  const db = loadTrackersDb();
  if (db[messageId]) {
    delete db[messageId];
    saveTrackersDb(db);
  }
}

/**
 * Registers and permanently runs an auto-refresh loop on a Discord Message object
 * @param {import('discord.js').Message} message
 * @param {string} timeframe
 * @param {string} currency
 * @param {boolean} withButtons
 */
export function registerPermanentLiveTracker(message, timeframe = '24h', currency = 'USD', withButtons = true) {
  if (!message || !message.id) return;
  const messageId = message.id;
  const channelId = message.channelId || message.channel?.id;
  const guildId = message.guildId || message.guild?.id || null;

  // Persist to database file
  saveLiveTracker({
    messageId,
    channelId,
    guildId,
    timeframe,
    currency,
    withButtons
  });

  // If a tracker already exists for this message, clear previous interval
  if (activeLiveTrackers.has(messageId)) {
    const existing = activeLiveTrackers.get(messageId);
    if (existing.timer) clearInterval(existing.timer);
    activeLiveTrackers.delete(messageId);
  }

  const timer = setInterval(async () => {
    try {
      const payload = await buildLtcMessage(timeframe, currency, withButtons);
      await message.edit(payload);
    } catch (err) {
      // If message (10008) or channel (10003) is deleted or not found (404), stop & purge tracker
      if (err.code === 10008 || err.code === 10003 || err.status === 404) {
        console.log(`[LiveTracker] Message or channel deleted (${messageId}), removing tracker.`);
        removeLiveTracker(messageId);
      } else {
        console.warn(`[LiveTracker] Transient edit error on ${messageId}:`, err.message);
      }
    }
  }, REFRESH_INTERVAL_SECONDS * 1000);

  activeLiveTrackers.set(messageId, { timer, timeframe, currency, withButtons, message });
}

/**
 * Restores all saved live trackers after a bot restart and forces an immediate fresh update
 * @param {import('discord.js').Client} client
 */
export async function restoreLiveTrackers(client) {
  const db = loadTrackersDb();
  const trackerIds = Object.keys(db);

  if (trackerIds.length === 0) {
    console.log('📊 [LiveTracker] No persistent live trackers to restore.');
    return;
  }

  console.log(`🔄 [LiveTracker] Restoring ${trackerIds.length} persistent live tracker(s)...`);

  for (const messageId of trackerIds) {
    const item = db[messageId];
    try {
      if (!item.channelId) {
        removeLiveTracker(messageId);
        continue;
      }

      const channel = await client.channels.fetch(item.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        console.warn(`[LiveTracker] Channel ${item.channelId} not found, cleaning up tracker ${messageId}.`);
        removeLiveTracker(messageId);
        continue;
      }

      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (!message) {
        console.warn(`[LiveTracker] Message ${messageId} not found in channel #${channel.name || item.channelId}, cleaning up.`);
        removeLiveTracker(messageId);
        continue;
      }

      // Perform an immediate refresh on startup so the message is up-to-date right away
      try {
        const payload = await buildLtcMessage(item.timeframe || '24h', item.currency || 'USD', item.withButtons ?? false);
        await message.edit(payload);
      } catch (refreshErr) {
        console.warn(`[LiveTracker] Initial refresh error on ${messageId}:`, refreshErr.message);
      }

      // Start the permanent live interval
      registerPermanentLiveTracker(
        message,
        item.timeframe || '24h',
        item.currency || 'USD',
        item.withButtons ?? false
      );

      console.log(`✅ [LiveTracker] Restored and refreshed live tracker (${messageId}) in #${channel.name || item.channelId}`);
    } catch (err) {
      console.error(`[LiveTracker] Failed to restore tracker ${messageId}:`, err.message);
    }
  }
}
