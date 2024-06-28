import { ApplicationCommandPermissionType, TextBasedChannel, VoiceState } from "discord.js";
import { Event } from "../types";
import InfoCommand from "../commands/info/info.command";

export default {
    name: "ready",
    once: true,
    async run(bot, _client) {
        bot.log(`Logged in as ${bot.user?.tag}!`);
        bot.loadIntervals();
        bot.matchMaking.forceUpdateQueues();
        // const channel = bot.channels.cache.get('1247293969923313754') as TextBasedChannel;
        // channel.send(await InfoCommand.generateInfoCard());
    }
} as Event<"ready">