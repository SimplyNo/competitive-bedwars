
import { APIEmbedField, Collection } from "discord.js";
import { Bot, botUsers, verifiedUsers } from "../../Bot";
import { MemberRoles } from "../../util/MemberRoles";
import { ModerationManager, ban, mute, strike } from "../../core/moderation/ModerationManager";
import { RankedGameManager } from "../../core/games/RankedGameManager";
import { RankedUserManager } from "../../core/games/RankedUserManager";
import { Wrappers } from "../../wrappers/Wrappers";
const memberUpdateCache = new Collection<string, { expire: number }>();
type NonFunctionProperties<T> = {
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];

export type RawVerifiedConfig = Pick<VerifiedConfig, Exclude<NonFunctionProperties<VerifiedConfig>, undefined | 'bot'>>;

export type StoredUserGame = {
    id: number;
    outcome: 'win' | 'loss' | 'void';
    mvp: boolean;
    bedBreak: boolean;
    elo: number;
    eloChange: number;
    date: number;
};

type rankedRecord = {
    elo: number;
    gameHistory: StoredUserGame[];
    wins: number;
    losses: number;
    voids: number;
    mvps: number;
    streak: number;
    highestStreak: number;
    bedsBroken: number;
    commends: number;
};

export class VerifiedConfig {
    readonly id: string;
    uuid: string | null;
    lastUpdate: number;
    username?: string;
    nick?: string;
    emojiRank?: string;
    rank?: string;
    rbw: rankedRecord;
    queueJoin?: boolean;
    commendsToGive: number = 2;
    showElo: boolean = true;
    constructor(private bot: Bot, options: Partial<VerifiedConfig>) {

        Object.assign(this, options);
        if (options.rbw) {
            const { elo, gameHistory, highestStreak, losses, mvps, streak, voids, wins, bedsBroken, commends } = options.rbw;
            this.rbw = {
                elo: elo ?? 0,
                gameHistory: gameHistory ?? [],
                wins: wins ?? 0,
                losses: losses ?? 0,
                voids: voids ?? 0,
                mvps: mvps ?? 0,
                streak: streak ?? 0,
                highestStreak: highestStreak ?? 0,
                bedsBroken: bedsBroken ?? 0,
                commends: commends ?? 0
            }
        }
    }
    public toJSON(): RawVerifiedConfig {
        const excludeKeys = ['bot']; // add keys to exclude here

        return <RawVerifiedConfig>Object.entries(this)
            .filter(([key, value]) => typeof value !== 'function' && !excludeKeys.includes(key) && value !== undefined)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
    }
    public set(options: Partial<RawVerifiedConfig>) {
        Object.assign(this, options);
        verifiedUsers.set(this.id, this.toJSON());
    }
    public getGameNickname() {
        return this.nick ?? this.username!;
    }
    public ranked() {
        return new RankedUserManager(this.bot, this);
    }
    public getUser() {
        return this.bot.getUser(this.id);
    }
    public getVerified() {
        return this.bot.getVerifiedUser({ id: this.id });
    }
    public async updateHypixelData(options?: { data?: any, force?: boolean }) {
        const { data, force } = options || {};
        if (this.lastUpdate + 5 * 60 * 1000 > Date.now() && !force) return;
        this.bot.log(`Updating hypixel data of ${this.username}`);
        let hypixelData = data || await Wrappers.hypixel.player(this.uuid);
        if (!hypixelData || !hypixelData.displayname) return;
        const { displayname, emojiRank } = hypixelData;
        this.set({
            username: displayname,
            emojiRank,
            lastUpdate: Date.now()
        })
        this.getUser().updateMember();
    }
}

