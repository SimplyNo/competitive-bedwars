import { ApplicationCommandPermissionType, Message, VoiceChannel } from "discord.js";
import { Event } from "../types";
import { Queue } from "../core/matchmaking/Queue";
import { Util } from "../util/Util";
const gameChannelLeavesTimeout = new Map<string, { timeout: NodeJS.Timeout, message: Message | undefined }>();
const channelDeleteTimeouts = new Map<string, NodeJS.Timeout>();
export default {
    name: "voiceStateUpdate",
    async run(bot, oldState, newState) {
        if (oldState.channelId === newState.channelId) return;
        console.log(`state change`, `new:`, newState.channel?.id, `old:`, oldState.channel?.id);
        const serverConfig = bot.getMainServerConfig();
        const { queue } = bot.config.channels;
        const verifiedUser = bot.getVerifiedUser({ id: newState.member?.id });
        if (!verifiedUser) return bot.log(`&e[QUEUES] User ${newState.member?.user.tag} is not registered.`);
        const currentGame = bot.rankedManager.getGameByMember(verifiedUser.id);
        if (currentGame) {
            // console.log(`current timeout list:`, gameChannelLeavesTimeout);
            const isInGameChannel = [currentGame.voiceChannel, currentGame.game?.team2Voice || null].includes(newState.channelId);
            if (!newState.channelId || !isInGameChannel) {
                if (newState.channelId) {
                    const teamChannel = <VoiceChannel>await bot.parseChannel(currentGame.game?.team2.find(p => p.id == verifiedUser.id) ? currentGame.game?.team2Voice : currentGame.voiceChannel, bot.getMainGuild()!);
                    const member = await verifiedUser.getUser().resolveMember();
                    // if (teamChannel) member?.voice.setChannel(teamChannel).catch(async e => { })
                    if (teamChannel && member) bot.api.workers.moveMember(member.id, teamChannel.id).catch(async e => { })
                } else {
                    // check if channels no longer exist:
                    await currentGame.checkIfGameExists();
                    if (currentGame.active) {
                        bot.log(`&e[QUEUES] &c${verifiedUser.username} has left the game.`);

                        const voidTime = Date.now() + 10000;
                        const message = await bot.logger.log(currentGame.textChannel, {
                            content: `<@${verifiedUser.id}> has left the game.`,
                            embeds: [
                                bot.createErrorEmbed()
                                    .setDescription(`A player has left the game channel; if they do not rejoin **${Util.getDiscordTimeFormat(voidTime, "R")}**, the game will be cancelled and the player will be issued a strike.

**(!) Warning (!)**
Do not leave the game, otherwise, you will be issued a strike. Wait for the player to rejoin or for the game to be cancelled.`)
                            ]
                        });
                        gameChannelLeavesTimeout.set(verifiedUser.id, {
                            timeout: setTimeout(async () => {
                                if (currentGame.active && ![currentGame.voiceChannel, currentGame.game?.team2Voice || null].includes(newState.member?.voice.channel?.id)) {
                                    bot.logger.log(currentGame.textChannel, {
                                        embeds: [
                                            bot.createErrorEmbed()
                                                .setTitle(`Game Voided`)
                                                .setDescription(`<@${verifiedUser.id}> did not join back and the game was automatically voided.`)
                                        ]
                                    })

                                    // strike everyone who is not in the channels
                                    const team1 = (<VoiceChannel>await bot.parseChannel(currentGame.voiceChannel, bot.getMainGuild()!))?.members.map(p => p.id);
                                    const team2 = (<VoiceChannel>await bot.parseChannel(currentGame.game?.team2Voice, bot.getMainGuild()!))?.members.map(p => p.id);
                                    const playersWhoLeft = currentGame.players.filter(p => ![...team1, ...team2].includes(p.id));
                                    console.log(`playersWhoLeft:`, playersWhoLeft.map(p => p.username))
                                    playersWhoLeft.forEach(p => {
                                        p.getUser().moderate().strike(bot.user?.id!, `Left the game voice channel.`);
                                    })
                                    gameChannelLeavesTimeout.delete(verifiedUser.id);
                                    currentGame.void(`${verifiedUser.username} left the game.`);
                                }
                            }, 10000), message
                        })
                    }
                }
                return;
            } else if (isInGameChannel && gameChannelLeavesTimeout.has(verifiedUser.id)) {
                const { timeout, message } = gameChannelLeavesTimeout.get(verifiedUser.id)!;
                console.log(`DETECT JOIN BAACK`)
                clearTimeout(timeout);
                gameChannelLeavesTimeout.delete(verifiedUser.id);
                message?.delete().catch(e => null);
                bot.logger.log(currentGame.textChannel, { content: `<@${verifiedUser.id}> has joined back.` })
            }
        }
        const party = verifiedUser.getUser().getParty();
        if (party?.leader.id === verifiedUser.id && party.autowarp) {
            const channel = newState.channel;
            if (channel) {
                party.warp(verifiedUser.id, channel);
            }
        };
        if (newState.channel) {
            if (newState.channelId === queue) {
                if (!(party?.leader.id !== verifiedUser.id && party?.autowarp && newState.channel.members.has(party?.leader.id!))) {
                    const partyChannel = await bot.matchMaking.getQueueChannel(verifiedUser);
                    if (!partyChannel) return bot.log(`&e[QUEUES] Could not find/create party channel for ${verifiedUser.username}`);

                    const member = await verifiedUser.getUser().resolveMember();
                    // member?.voice.setChannel(partyChannel).catch(async e => {
                    if (member) bot.api.workers.moveMember(member?.id, partyChannel.id).catch(async e => {
                        // retry in the rare case the channel gets deleted the moment it tries to move people:
                        bot.log(`&7Rare error occured: couldnt move users, retrying `)
                        const channel = await bot.matchMaking.getQueueChannel(verifiedUser);
                        if (!channel) return bot.log(`&e[QUEUES] Could not find/create party channel for ${verifiedUser.username} SECOND TIME!!!!!!!`);
                        // member?.voice.setChannel(channel).catch(e => console.error('it happened again oh well'));
                        bot.api.workers.moveMember(member.id, channel.id).catch(e => console.error('it happened again oh well'));
                    });
                }
            }
            if ((await bot.matchMaking.getQueueChannel(verifiedUser, false))?.id === newState.channel?.id) {

                // console.log(`clearing timeout`)
                clearTimeout(channelDeleteTimeouts.get(newState.channel.id));
                console.log(verifiedUser.username, !(party?.leader.id !== verifiedUser.id && party?.autowarp))
                bot.matchMaking.add(verifiedUser);
            }
        }
        if (oldState.channel) {
            if (serverConfig.isPartyChannel(oldState.channel.id)) {
                if (oldState.channel.members.size === 0) {
                    bot.log(`&e[QUEUES] &c${verifiedUser.username}'s channel is empty. Deleting...`)
                    channelDeleteTimeouts.set(oldState.channel.id, setTimeout(() => {
                        if (oldState.channel && oldState.channel.members.size === 0) {
                            bot.log(`&e[QUEUES] Deleted!.`)
                            bot.api.workers.deleteChannel(oldState.channel.id);

                            // oldState.channel.delete().catch(e => bot.log(`&e[QUEUES] &cCould not delete ${verifiedUser.username}'s channel. It probably already got deleted`));
                        }
                    }, 5 * 1000))
                }
                if (!newState.channel || ((serverConfig.partyChannels[party?.leader.id || verifiedUser.id]?.id !== newState.channel.id)) && !verifiedUser.queueJoin) {
                    bot.matchMaking.remove(verifiedUser);
                }
            }
        }
        if (!newState.channel && bot.matchMaking.isInQueue(verifiedUser)) {
            bot.matchMaking.remove(verifiedUser);
        }
    }
} as Event<"voiceStateUpdate">
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