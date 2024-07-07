import Enmap from "enmap";
import { RankedGame, RawRankedGame, teamPlayer } from "./RankedGame";
import { Bot } from "../../Bot";
import { RawVerifiedConfig, VerifiedConfig } from "../../types/config/VerifiedConfig";
import { AttachmentBuilder, ChannelType, Collection, Message, MessageFlags, PermissionFlagsBits, TextChannel } from "discord.js";
import { Util } from "../../util/Util";
import { Party } from "../party/Party";

export const rbwGames = new Enmap<string, RawRankedGame>({
    name: 'games'
});

export type validStats = 'wins' | 'losses' | 'mvps' | 'streak' | 'wlr' | 'games' | 'bedsBroken' | 'elo' | 'commends' | 'mvp_percent' | 'beds_percent';
export class RankedGameManager {
    private gameInstances = new Collection<string, RankedGame>();
    private games = rbwGames;
    public _games = rbwGames;
    constructor(private bot: Bot) {

    }
    _deleteAllGames() {
        this.games.clear()
    }
    async refreshActiveGames() {
        this.getActiveGames().forEach(async game => {
            const textchannel = await this.bot.parseChannel(game.textChannel, this.bot.getMainGuild()!);
            if (!textchannel) {
                console.log(`[Refresh] Closing game #${game.id} because the text channel doesnt exist.`);
                return game.close();
            }
        })
    }
    private loadGame(game: RawRankedGame) {
        const instanced = this.gameInstances.get(game.id.toString());
        if (instanced) return instanced;
        const instance = new RankedGame(this.bot, game);
        this.gameInstances.set(game.id.toString(), instance);
        return instance;
    }
    public getLeaderboard(stat: validStats) {
        const players = this.bot.getAllVerifiedUsers();
        const sorted = players.sort((a, b) => b.ranked().getStat(stat) - a.ranked().getStat(stat));
        return sorted;
    }
    public getActiveGames() {
        return this.games.filter(g => g.active).map(g => this.loadGame(g));
    }
    public async createGame(groups: { players: VerifiedConfig[] }[]) {
        const id = rbwGames.size + 1;
        const players = groups.map(g => g.players).flat();

        const game = new RankedGame(this.bot, { id, players, active: true, created: Date.now() });

        this.gameInstances.set(id.toString(), game);
        rbwGames.set(id.toString(), game.toJSON());


        const { team1, team2 } = await this.createBalancedTeams(groups);
        // return console.log({ team1: team1.map(p => p.username), team2: team2.map(p => p.username) });
        console.log(`match creation:`, groups)
        const { textChannel, voiceChannelTeam1, voiceChannelTeam2 } = await this.createTeamChannels(id.toString(), players);
        if (!textChannel || !voiceChannelTeam1 || !voiceChannelTeam2) return console.error(`!!! FAILED TO CREATE GAME: COULDNT CREATE CHANNELS?`);

        game.update({
            textChannel: textChannel.id,
            voiceChannel: voiceChannelTeam1.id,
            game: {
                team1: team1.map((p, i) => ({ captain: i === 0, id: p.id })),
                team2: team2.map((p, i) => ({ captain: i === 0, id: p.id })),
                team1Voice: voiceChannelTeam1.id,
                team2Voice: voiceChannelTeam2.id
            }
        });
        const members = await this.bot.getMainGuild()!.members.fetch({ user: players.map(p => p.id) });
        // Promise.all(members.map(m => team1.find(p => p.id === m.id) ? m.voice.setChannel(voiceChannelTeam1).catch(e => console.error(`error moving ppl`)) : m.voice.setChannel(voiceChannelTeam2).catch(e => console.error(`error moving ppl`))))
        Promise.all(members.map(m => team1.find(p => p.id === m.id) ? this.bot.api.workers.moveMember(m.id, voiceChannelTeam1.id).catch(e => console.error(`error moving ppl`)) : this.bot.api.workers.moveMember(m.id, voiceChannelTeam2.id).catch(e => console.error(`error moving ppl`))))

        const teamsMsg = await textChannel.send({
            content: `${players.map(u => `<@${u.id}>`).join(' ')}`,
            embeds: [
                this.bot.createEmbed()
                    .setTitle(`Game #${id} | Teams`)
                    .addFields([
                        { name: `Team 1`, value: `${team1.map(p => `<@${p.id}>`).join('\n') || 'No Players'}`, inline: true },
                        { name: `Team 2`, value: `${team2.map(p => `<@${p.id}>`).join('\n') || 'No Players'}`, inline: true },
                    ])
            ]
        })
        await textChannel.send({
            embeds: [
                this.bot.createEmbed()
                    .setTitle(`/Party Commands`)
                    .setDescription(`
\`\`\`
/party ${team1.map(p => p.username).join(' ')}
\`\`\`
\`\`\`
/party ${team2.map(p => p.username).join(' ')}
\`\`\`
`)
            ]
        })
        await textChannel.send({
            embeds: [
                this.bot.createEmbed()
                    .setTitle(`Current Map Pool`)
                    .setDescription(`${this.bot.config.mapPool.map(m => `• **${m}**`).join('\n')}\n\nOnly 1 ban map.`)
            ]
        })
        await textChannel.send(`Game has started. Use \`=score [replay]\` to score the game.`)

        await textChannel.send({
            files: [
                new AttachmentBuilder('../../assets/rules.png')
            ]
        })
    }
    private async createBalancedTeams(groups: { players: VerifiedConfig[] }[]) {
        let team1: VerifiedConfig[] = [];
        let team2: VerifiedConfig[] = [];
        let avgEloGroups = Util.shuffle(groups).map(g => ({ players: g.players, avgElo: g.players.reduce((prev, curr) => prev + curr.rbw.elo, 0) / g.players.length })).sort((a, b) => b.avgElo - a.avgElo).sort((a, b) => b.players.length - a.players.length);
        // for (const { players, avgElo } of avgEloGroups.sort((a, b) => b.avgElo - a.avgElo)) {
        for (const { players, avgElo } of avgEloGroups) {
            const team1Elo = team1.reduce((prev, curr) => prev + curr.rbw.elo, 0);
            const team2Elo = team2.reduce((prev, curr) => prev + curr.rbw.elo, 0);
            console.log(`assigning team:`, players.map(p => p.username));
            if (team1Elo <= team2Elo && team1.length < 4) {
                team1.push(...players);
            } else if (team2.length < 4) {
                team2.push(...players);
            } else {
                team1.push(...players);
            }
        }
        console.log(`groups:`, avgEloGroups);
        console.log(`finalized teams:`, team1.map(e => [e.username, e.rbw.elo]), team2.map(e => [e.username, e.rbw.elo]))
        return { team1, team2 }
    }
    private async createTeamChannels(id: string, players: VerifiedConfig[]) {
        // const permissionOverwrites = [];
        const permissionOverwritesVoice = [
            ...players.map(u => ({
                id: u.id,
                allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
            })),
            {
                id: this.bot.getMainGuild()?.roles.everyone.id!,
                deny: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
            }
        ];
        const permissionOverwritesText = [
            ...players.map(u => ({
                id: u.id,
                allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
            })),
            {
                id: this.bot.getMainGuild()?.roles.everyone.id!,
                deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
            }
        ];
        console.log(`PERM OVERWRITES:`, permissionOverwritesVoice);
        const textChannel = await this.bot.api.workers.createChannel({
            name: `Game #${id}`,
            type: ChannelType.GuildText,
            parent: this.bot.config.channels.gamesCategory,
            permissionOverwrites: permissionOverwritesText,
        });
        const voiceChannelTeam1 = await this.bot.api.workers.createChannel({
            name: `#${id} Team 1`,
            type: ChannelType.GuildVoice,
            parent: this.bot.config.channels.gamesCategory,
            permissionOverwrites: permissionOverwritesVoice,
            userLimit: 4
        });
        const voiceChannelTeam2 = await this.bot.api.workers.createChannel({
            name: `#${id} Team 2`,
            type: ChannelType.GuildVoice,
            parent: this.bot.config.channels.gamesCategory,
            permissionOverwrites: permissionOverwritesVoice,
            userLimit: 4
        });
        return { textChannel, voiceChannelTeam1, voiceChannelTeam2 };
    }
    // public async createGame_(players: VerifiedConfig[],) {
    //     const id = rbwGames.size + 1;
    //     const game = new RankedGame(this.bot, { id, players, active: true });
    //     rbwGames.set(id.toString(), game.toJSON());

    //     const voiceChannel = await this.bot.getMainGuild()?.channels.create({
    //         name: `Game #${id}`,
    //         type: ChannelType.GuildVoice,
    //         parent: this.bot.config.channels.gamesCategory,
    //         permissionOverwrites: [
    //             ...players.map(u => ({
    //                 id: u.id,
    //                 allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
    //             }))
    //         ],
    //     }).catch(e => console.error(e));
    //     if (!voiceChannel) return console.error(`!!! FAILED TO CREATE GAME: COULDNT CREATE VOICE CHANNEL?`)
    //     const members = await this.bot.getMainGuild()!.members.fetch({ user: players.map(p => p.id) });

    //     await Promise.all(members.map(m => m.voice.setChannel(voiceChannel).catch(e => console.error(`error while setting voice for `, m.user.username))))
    //     const queueChannels = this.bot.getMainServerConfig().partyChannels;
    //     players.forEach(player => {
    //         // console.error('Attempting to delete channel', player.username);
    //         if (queueChannels[player.id]) {
    //             // console.error('Deleting channel', player.username);
    //             const channel = this.bot.getMainGuild()?.channels.cache.get(queueChannels[player.id].id);
    //             channel?.delete();
    //             delete queueChannels[player.id];
    //         }
    //     })
    //     this.bot.getMainServerConfig().set({ partyChannels: queueChannels });

    //     const textChannel = await this.bot.getMainGuild()?.channels.create({
    //         name: `match-${id}`,
    //         type: ChannelType.GuildText,
    //         parent: this.bot.config.channels.gamesCategory,
    //         permissionOverwrites: [
    //             ...players.map(u => ({
    //                 id: u.id,
    //                 allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
    //             })),
    //             {
    //                 id: this.bot.getMainGuild()?.roles.everyone.id!,
    //                 deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
    //             }
    //         ],
    //     })
    //     if (!textChannel) return console.error(`!!! FAILED TO CREATE GAME: COULDNT CREATE TEXT CHANNEL?`)
    //     game.update({ textChannel: textChannel.id, voiceChannel: voiceChannel.id });

    //     if (!voiceChannel || !textChannel) return this.bot.log(`&c !!!!!!!!!!!!!! ERROR Failed to create channels for match.`);

    //     const teamsMsg = await textChannel.send({
    //         content: `${players.map(u => `<@${u.id}>`).join(' ')}`,
    //     })

    //     /** const teams_ = await this.pickingPhase(game, textChannel, teamsMsg); */

    //     const teams = {
    //         captains: [],
    //         team1: players.slice(0, 2),
    //         team2: players.slice(2, 4)
    //     }
    //     console.log(`picking phase complete, teams:`, teams)
    //     if (!teams) {
    //         game.close();
    //         return;
    //     }
    //     const { captains, team1, team2 } = teams;
    //     const team1VoiceChannel = await voiceChannel.edit({
    //         name: `#${id} | Team 1`
    //     })
    //     const team2VoiceChannel = await voiceChannel.clone({
    //         name: `#${id} | Team 2`
    //     })
    //     game.update({
    //         game: {
    //             team1: team1.map((e, i) => ({ captain: i == 0, id: e.id })),
    //             team2: team2.map((e, i) => ({ captain: i == 0, id: e.id })),
    //             team1Voice: team1VoiceChannel.id,
    //             team2Voice: team2VoiceChannel.id
    //         },
    //     })
    //     textChannel.send(`Match has started. Use \`=score [replay link]\` to score the match.`)
    // }
    private async pickingPhase(game: RankedGame, textChannel: TextChannel, teamsMsg: Message<true>): Promise<{ team1: VerifiedConfig[], team2: VerifiedConfig[], captains: VerifiedConfig[] } | null> {
        return new Promise(async res => {
            const { players, id } = game;

            const captains = Util.shuffle(players).slice(0, 2);
            let team1: VerifiedConfig[] = [captains[0]];
            let team2: VerifiedConfig[] = [captains[1]];
            let pickingOrder = [0, 1, 1, 0, 0, 1];
            const getAvailablePlayers = () => players.filter(p => !team1.find(t => t.id === p.id) && !team2.find(t => t.id === p.id));
            const getTeamPickingEmbed = () => {
                return this.bot.createEmbed()
                    .setTitle(`Game #${id} | Team Picking`)
                    .addFields([
                        { name: `Team 1 ${pickingOrder[0] === 0 ? '(picking...)' : ''}`, value: `${team1.map(p => `<@${p.id}> ${captains[0].id === p.id ? '(Captain)' : ''}`).join('\n')}`, inline: true },
                        { name: `Team 2 ${pickingOrder[0] === 1 ? '(picking...)' : ''}`, value: `${team2.map(p => `<@${p.id}> ${captains[1].id === p.id ? '(Captain)' : ''}`).join('\n')}`, inline: true },
                        { name: 'Available Players', value: `${getAvailablePlayers().map(p => `<@${p.id}>`).join('\n') || 'No Players Remaining'}` }
                    ])
            }
            let delMessage = await textChannel.send({ embeds: [getTeamPickingEmbed()] });
            textChannel.send({ content: `<@${captains[0].id}>`, embeds: [this.bot.createEmbed().setDescription(`It’s your turn to pick. Use \`=p @user\` to pick them.`)] })
            const collector = textChannel.createMessageCollector({ time: 5 * 60 * 1000 });
            collector.on('collect', async (msg) => {
                const currentlyPicking = pickingOrder[0];
                const captainPicking = currentlyPicking === 0 ? captains[0] : captains[1];

                if (msg.author.id !== captainPicking.id) return;
                if (!msg.content.startsWith('=')) return;
                const args = msg.content.split(' ');
                const command = args.shift()?.slice(1).toLowerCase();
                if (!command || !['pick', 'p'].includes(command)) return;
                if (!args[0]) return this.bot.createErrorEmbed(msg).setDescription(`Please mention a player to pick.`).send();
                const player = await this.bot.parseMember(args[0], this.bot.getMainGuild()!);
                if (currentlyPicking !== pickingOrder[0]) return this.bot.createErrorEmbed(msg).setDescription(`You already picked someone.`).send();
                if (!player) return msg.reply(`Something went wrong trying to pick this player. please report this to the developer.`);
                if (!getAvailablePlayers().find(p => p.id == player?.id)) return this.bot.createErrorEmbed(msg).setDescription(`${player} is on the remaining players list.`).send();
                const verified = this.bot.getVerifiedUser({ id: player.id });
                if (!verified) return msg.reply(`This player is not registered!`);
                if (currentlyPicking === 0) team1.push(verified);
                if (currentlyPicking === 1) team2.push(verified);
                pickingOrder = pickingOrder.reverse();
                if (delMessage) delMessage.delete();
                delMessage = await textChannel.send({ embeds: [getTeamPickingEmbed()] })
                await this.bot.createSuccessEmbed(msg).setDescription(`${player} has been picked to join **Team ${currentlyPicking + 1}**.`).send();
                if (getAvailablePlayers().length === 1) {
                    const lastPlayer = getAvailablePlayers[0];
                    if (pickingOrder[0] === 0) team1.push(lastPlayer);
                    if (pickingOrder[0] === 1) team2.push(lastPlayer);
                    textChannel.send({ embeds: [this.bot.createEmbed().setDescription(`${lastPlayer} has been put on **Team ${pickingOrder[0] + 1}**. Creating game channels...`)] })
                    collector.stop('complete');
                } else {
                    textChannel.send({ content: `<@${captains[0].id}>`, embeds: [this.bot.createEmbed().setDescription(`It's your turn to pick. Use \`=p @user\` to pick them.`)] })
                }
            })
            collector.on('end', async (_, reason) => {
                if (reason === 'time') {
                    await textChannel.send({ embeds: [this.bot.createErrorEmbed(textChannel).setDescription(`Teams took too long to be chosen. Cancelling game...`)] });
                    res(null);
                    game.close();
                } else if (reason === 'complete') {
                    res({ captains, team1, team2 })
                } else {
                    res(null);
                }
            })
        })

    }
    public getGameByMember(memberID: string) {
        const game = this.getActiveGames().find(g => g.players.map(p => p.id).includes(memberID));
        // console.log(`game:  `, game?.toJSON())
        return game ? this.loadGame(game) : null;
    }
    public getGameByReplayID(id: string) {
        const game = this.games.find(g => g.replayScoring?.replayID === id);
        return game ? this.loadGame(game) : null;
    }
    public getGameByVoiceChannel(channelID: string) {
        const game = this.games.filter(g => g.active).find(g => g.game?.team1Voice === channelID || g.game?.team2Voice === channelID);
        return game ? this.loadGame(game) : null;
    }
    public getGameByTextChannel(channelID: string, includeInactives = false) {
        const game = this.games.filter(g => includeInactives || g.active).find(g => g.textChannel === channelID);
        return game ? this.loadGame(game) : null;
    }
    public getGameByID(id: number) {
        const game = this.games.get(id.toString());
        if (!game) return null;
        return this.loadGame(game);
    }

}