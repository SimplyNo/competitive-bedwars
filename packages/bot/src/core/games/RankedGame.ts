import { GuildMember, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextBasedChannel, BaseMessageOptions, GuildTextBasedChannel, TextChannel, VoiceChannel } from "discord.js";
import { Bot } from "../../Bot";
import { NonFunctionProperties, ServerConfig } from "../../types/config/ServerConfig";
import { Util } from "../../util/Util";
import discordTranscripts, { ExportReturnType } from "discord-html-transcripts";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
import { RankedGameManager, rbwGames } from "./RankedGameManager";
import { PlayerResult } from "../api/routes/score";
import { ranks } from "../../../../../score_sheet.json";
import ScoreImage, { ScoreCardPlayer } from "./ScoreImage";
export type RawRankedGame = Pick<RankedGame, Exclude<NonFunctionProperties<RankedGame>, undefined>>
export type teamPlayer = {
    captain: boolean,
    id: string,
}

export class RankedGame {
    private readonly manager: RankedGameManager;
    originalElos: Record<string, number>;
    created: number;
    players: VerifiedConfig[] = [];
    _players: string[] = [];
    active: boolean;
    replayScoring: {
        replayID: string
    } | null = null;
    voided?: {
        reason: string
    }
    results?: {
        winner: 'team1' | 'team2',
        mvps: { id: string }[],
        bedBreaks: { id: string }[],
        eloChanges: { id: string, change: number }[]
    }
    game?: {
        team1Voice: string,
        team2Voice: string,
        team1: teamPlayer[],
        team2: teamPlayer[],
    }
    textChannel?: string;
    voiceChannel?: string;
    id: number;

    constructor(private bot: Bot, options: Partial<RawRankedGame>) {
        Object.assign(this, options);
        this.manager = bot.rankedManager;
        if (!this.originalElos && options.players) options.players.forEach(player => this.originalElos = { ...this.originalElos, [player.id]: player.ranked().getStat('elo') });
        if (options.players) this._players = options.players.map(p => p.id);
        if (options._players) this.players = options._players.map(p => bot.getVerifiedUser({ id: p })!);
    }
    public toJSON(): RawRankedGame {
        const excludeKeys = ['bot', 'manager', 'players']; // add keys to exclude here

        return <RawRankedGame>Object.entries(this)
            .filter(([key, value]) => typeof value !== 'function' && !excludeKeys.includes(key) && value !== undefined)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
    }
    public async checkIfGameExists() {
        // check channels
        const channel1 = await this.bot.parseChannel(this.game?.team1Voice, this.bot.getMainGuild()!);
        const channel2 = await this.bot.parseChannel(this.game?.team2Voice, this.bot.getMainGuild()!);
        if (!channel1 || !channel2) {
            this.close({ force: true });
            return false;
        }
    }
    public getTeamPlayers = (team: 'team1' | 'team2') => this.players.filter(p => this.game?.[team].some(t => t.id === p.id));
    public async update(options: Partial<RawRankedGame>) {
        Object.assign(this, options);
        rbwGames.set(this.id.toString(), { ...this.toJSON(), ...options });
    }
    private undoScore() {
        this.players.forEach(player => {
            const eloChange = this.results?.eloChanges.find(e => e.id === player.id)?.change ?? 0;
            player.ranked().undoGame(this.id, eloChange);
        })
        this.update({ results: undefined });
    }
    public async scoreGame(results: Omit<Exclude<Required<RankedGame['results']>, undefined>, "eloChanges">, forceElo = false) {
        let rescore = !!this.results;
        if (this.results) this.undoScore();
        if (!this.game) return console.error(`!!!!!! TRYING TO SCORE A GAME THAT DOESN'T EXIST??? ID: ${this.id}`);
        const winners = results.winner === 'team1' ? this.game.team1 : this.game.team2;
        const losers = results.winner === 'team1' ? this.game.team2 : this.game.team1;
        const eloChanges: { id: string, change: number }[] = [];
        let playerStrings: Record<string, string> = {};
        const scoringPlayers: ScoreCardPlayer[] = [];
        const score = (player: teamPlayer, winner: boolean) => {
            const verified = this.players.find(p => (p.id === player.id));
            if (!verified) return console.error(`!!!!!!! COULD NOT SCORE ${player.id} BECAUSE THEY AREN'T VERIFIED??????`)
            const mvp = results.mvps.find(m => m.id === player.id);
            const bedBreak = results.bedBreaks.find(b => b.id === player.id);
            const change = verified.ranked().scoreGame(this.id, winner, !!mvp, !!bedBreak, forceElo ? { startingElo: this.originalElos?.[verified.id] } : undefined);
            eloChanges.push({ id: player.id, change });
            const newElo = verified.ranked().getStat('elo');
            const oldElo = newElo - change;
            scoringPlayers.push({
                team: winner ? results.winner : results.winner === 'team1' ? 'team2' : 'team1',
                oldElo,
                newElo,
                mvp: !!mvp,
                bed: !!bedBreak,
                username: verified.username || "PLAYER"
            })
            playerStrings[player.id] = `<@${player.id}> \`${change > 0 ? `+${change}` : `-${change}\``} **${oldElo} -> ${newElo}** ${mvp ? '🏆' : ''} ${bedBreak ? '🛏️' : ''}`;
        }

        winners.forEach(p => score(p, true));
        losers.forEach(p => score(p, false));
        this.update({
            results: {
                ...results,
                eloChanges
            },
            voided: undefined
        })
        this.bot.logger.log(this.bot.config.channels.gameLogs, {
            content: `${this.players.map(p => `<@${p.id}>`).join(' ')}${rescore ? '(Rescored)' : ''}`,
            files: [
                await ScoreImage.generateScoreImage(this.id, results.winner, scoringPlayers)
            ]
        })
        this.players.forEach(p => p.getUser().updateMember(true));
        // this.bot.logger.log(this.bot.config.channels.gameLogs, {
        //     embeds: [
        //         this.bot.createEmbed()
        //             .setTitle(`Match ${this.id} Results`)
        //             .addFields([
        //                 { name: `Winners`, value: winners.map(player => playerStrings[player.id]).join('\n'), inline: true },
        //                 { name: `Losers`, value: losers.map(player => playerStrings[player.id]).join('\n'), inline: true },
        //             ])
        //     ]
        // })
    }
    public async void(reason: string) {
        if (this.results) this.undoScore();

        this.update({ voided: { reason } });
        this.players.forEach(player => {
            player.ranked()
                .scoreVoidGame(this.id);
        })
        return this.close();
    }
    public async close(options?: Partial<{ force: boolean, moveToScoring: boolean }>) {
        const { force, moveToScoring } = {
            force: false,
            moveToScoring: false,
            ...options
        }
        if (!force && !this.active) return;
        this.update({
            active: false
        })
        const joinQueue = <VoiceChannel>await this.bot.parseChannel(this.bot.config.channels.queue, this.bot.getMainGuild()!);
        for (const [id, member] of joinQueue.members) {
            if (this.players.some(p => p.id === member.id)) {
                this.bot.matchMaking.addToQueueChannel(member);
            }
        }
        const voiceChannel = await this.bot.parseChannel(this.voiceChannel, this.bot.getMainGuild()!);
        const textChannel = await this.bot.parseChannel(this.textChannel, this.bot.getMainGuild()!);
        const team2Voice = await this.bot.parseChannel(this.game?.team2Voice, this.bot.getMainGuild()!);
        if (!force) {
            if (moveToScoring) {
                textChannel?.send({ embeds: [this.bot.createEmbed().setTitle(`🚧 Game Ended 🚧`).setDescription(`The game has ended, and a replay has been submitted.\n\nVoice channels will close in **10 Seconds** while this channel will be be renamed and remain open until the game is scored. Thanks for playing!`)] });
                textChannel?.edit({
                    parent: this.bot.config.channels.scoringCategory,
                    name: `scoring-game-${this.id}`
                })
            } else {
                textChannel?.send({ embeds: [this.bot.createEmbed().setTitle(`🚧 Game Ended 🚧`).setDescription(`The game has ended, and the channels will close in **10 Seconds**. Thanks for playing!`)] });
            }
            await Util.wait(10 * 1000);
        }
        // console.log('channels:', voiceChannel, textChannel, team2Voice);
        [voiceChannel, textChannel, team2Voice].forEach(async channel => {
            console.log(`deleteing voice cahnnels !!!`)
            if (!channel) return;
            if (channel.isTextBased() && !channel.isVoiceBased() && moveToScoring) return console.log(`not deleteing because voice based.`);
            if (channel.isVoiceBased()) {
                for (const [id, member] of channel.members) {
                    await this.bot.api.workers.moveMember(member.id, this.bot.config.channels.waitingRoom);
                    // await member.voice.setChannel(this.bot.config.channels.waitingRoom);
                }
            }
            this.bot.api.workers.deleteChannel(channel.id);

            // channel.delete().catch(e => this.bot.log(`&c-> failed to delete channel ${channel.name}. probably already deleted`));
        })


    }
}