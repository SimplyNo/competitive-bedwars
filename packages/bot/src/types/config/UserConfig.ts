import { APIEmbedField, Collection } from "discord.js";
import { Bot, botUsers } from "../../Bot";
import { MemberRoles } from "../../util/MemberRoles";
import { ModerationManager, ban, mute, strike } from "../../core/moderation/ModerationManager";
import { Util } from "../../util/Util";
const memberUpdateCache = new Collection<string, { expire: number }>();
type NonFunctionProperties<T> = {
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];

export type RawUserConfig = Pick<UserConfig, Exclude<NonFunctionProperties<UserConfig>, undefined | 'bot'>>;

export class UserConfig {
    readonly id: string;
    username: string;
    strikes: strike[] = [];
    punishmentHistory: ({ type: 'mute', } & mute | { type: 'rankban' } & ban)[] = [];
    mute?: mute;
    ban?: ban;
    rankBan?: ban;
    rolesToReturn?: string[];
    ignoreList?: string[] = [];
    constructor(private bot: Bot, options: Partial<UserConfig>) {
        Object.assign(this, options);
        this.username = this.bot.users.cache.get(this.id)?.username ?? this.username;
    }
    public toJSON(): RawUserConfig {
        const excludeKeys = ['bot']; // add keys to exclude here

        return <RawUserConfig>Object.entries(this)
            .filter(([key, value]) => typeof value !== 'function' && !excludeKeys.includes(key) && value !== undefined)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
    }
    public set(options: Partial<RawUserConfig>) {
        Object.assign(this, options);
        botUsers.set(this.id, this.toJSON());
    }
    public getVerified() {
        return this.bot.getVerifiedUser({ id: this.id });
    }
    public async resolveDiscord() {
        try {
            return await this.bot.users.fetch(this.id);
        } catch (e) {
            return null;
        }
    }
    public async isRankBanned() {
        const member = await this.resolveMember();
        return member?.roles.cache.has(this.bot.config.roles.rankbanned);
    }
    public async isFrozen() {
        const member = await this.resolveMember();
        return member?.roles.cache.has(this.bot.config.roles.frozen);
    }
    public async resolveMember() {
        try {
            return await this.bot.parseMember(this.id, this.bot.getMainGuild()!);
        } catch (e) {
            return null;
        }
    }
    public moderate() {
        return new ModerationManager(this.bot, this);
    }
    public getParty() {
        return this.bot.partyManager.getPartyByMember(this.id);
    }
    public async updateMember(force = false) {
        if (!force && (memberUpdateCache.get(this.id)?.expire ?? 0) > Date.now()) return;
        memberUpdateCache.set(this.id, { expire: Date.now() + 30 * 1000 });
        const verifiedUser = this.getVerified();
        const member = await this.bot.parseMember(this.id, this.bot.getMainGuild()!);
        if (!member) return this.bot.log(`&cCould not find member ${this.id}`);
        this.bot.getUser(this.id).set({ username: member.user.username });
        const memberRoles = new MemberRoles(member);
        if (verifiedUser) {
            // do nicknming
            const elo = verifiedUser.showElo ? `(${Util.nFormatter(verifiedUser.rbw.elo, 1)})` : '';
            const nickname = `${verifiedUser.username}${verifiedUser.nick ? ` | ${verifiedUser.nick} ` : ' '}${elo}`;
            if (member.nickname !== nickname) {
                await member.setNickname(nickname).catch(e => this.bot.log(`&cCould not set nickname for ${member.user.tag}`));
            }
            // add register role
            memberRoles.addRole(this.bot.config.roles.registered);
            // add rank role
            memberRoles.addRole(verifiedUser.ranked().getRankFromElo().role);
        } else {
            await member.setNickname(null).catch(e => this.bot.log(`&cCould not remove nickname for ${member.user.tag}`));
            memberRoles.removeRole(this.bot.config.roles.registered);
        }
        // const setRoles = !['280466694663831553'].includes(member.id) ? await memberRoles.set() : null;
        const setRoles = await memberRoles.set();

        if (setRoles) {
            // console.log(setRoles)
            const fields: APIEmbedField[] = [];
            if (memberRoles.rolesToAdd.length) fields.push({ name: `Roles Added`, value: memberRoles.rolesToAdd.map(e => `\`+\` <@&${e.id}> \`Reason:\` ${e.reason}`).join('\n') });
            if (memberRoles.rolesToRemove.length) fields.push({ name: `Roles Removed`, value: memberRoles.rolesToRemove.map(e => `\`-\` <@&${e.id}> \`Reason:\` ${e.reason}`).join('\n') });
            // this.logger.log(autoRoleLogChannel, { embeds: [this.createEmbed().setTitle(`RBWR → Role Changes`).setDescription(`Updated ${member}'s roles.`).addFields(fields).setThumbnail(member.user.avatarURL())] })
        }
        return null;
        ;

    }
}
