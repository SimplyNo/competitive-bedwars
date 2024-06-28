import { ApplicationCommandPermissionType } from "discord.js";
import { Event } from "../types";
import { Queue } from "../core/matchmaking/Queue";

export default {
    name: "channelDelete",
    async run(bot, channel) {
        const game = bot.rankedManager.getGameByTextChannel(channel.id);
        if (game?.active) {
            bot.log(`&1Game #${game.id} closed due to channel deletion.`)
            game.close();
        }
    }
} as Event<"channelDelete">
// add them to the queue, and make their own voice channel;
// async run(bot, oldState, newState) {
//     console.log(`state change`);
//     const { queue0_300, queue300_600, queue600_plus } = bot.config.channels;
//     const queueMapping: Record<string, queue> = {
//         [queue0_300]: '0_300',
//         [queue300_600]: '300_600',
//         [queue600_plus]: '600_plus',
//     };
//     const verifiedUser = bot.getVerifiedUser({ id: newState.member?.id });
//     if (!verifiedUser) return bot.log(`&e[QUEUES] User ${newState.member?.user.tag} is not verified.`);
//     const newQueue = queueMapping[newState.channelId || ''];
//     const oldQueue = queueMapping[oldState.channelId || ''];
//     if (newQueue && newState.channelId && (oldState.channelId !== newState.channelId)) {
//         console.log(`${newState.member?.user.tag} has joined #${newState.channel?.name}. New people connected: ${newState.channel?.members.size}`);
//         if (newState.member) bot.matchMaking.add(verifiedUser, newQueue);

//     }
//     if (oldQueue && oldState.channelId && (oldState.channelId !== newState.channelId)) {
//         console.log(`${oldState.member?.user.tag} has left #${oldState.channel?.name}. New people connected: ${oldState.channel?.members.size}`);
//         if (oldState.member) bot.matchMaking.remove(verifiedUser, oldQueue);

//     }
// }