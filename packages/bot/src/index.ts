import { ActivityType, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { Bot } from './Bot';
import Redis from "ioredis";
export const redis = new Redis();
global.redis = redis;
console.log('Starting Competitive Bedwars Bot...');
// creating a new instance automatically starts the bot.
const bot = new Bot({
    presence:
    {
        activities:
            [{
                name: "Competitive Bedwars",
                type: ActivityType.Watching
            }]
    },
    allowedMentions: {
        repliedUser: false,
        parse: ['users', 'roles']
    },
    intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Reaction,
        Partials.Message
    ],
    failIfNotExists: false
});
bot.on('debug', (msg) => {
    if (bot.config.env == 'dev') console.log(msg);
});
bot.rest.on('rateLimited', (info) => {
    console.log(`Rate limited!`, info);
    if (info.route === '/channels/:id/messages/:id') {
        console.log(`setting rate limit for ${info.majorParameter}`)
        bot.messageEditRateLimits.set(info.majorParameter, Date.now() + info.retryAfter + 5000);
    }
})
process.on('uncaughtException', err => {
    if (err.name === "ERR_IPC_CHANNEL_CLOSED") process.exit(1);
    console.error(`UNCAUGHT ERROR:`, err);
    if (bot.config.env == 'dev') {
        process.exit(1); // mandatory (as per the Node.js docs)
    }
    // process.exit(1);
});

