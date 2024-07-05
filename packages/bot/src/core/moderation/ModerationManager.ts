import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedField, TextChannel, User } from "discord.js";
import { Bot } from "../../Bot";
import { UserConfig } from "../../types/config/UserConfig";
import { Util } from "../../util/Util";
export type strike = { date: number, reason?: string, moderator: string };
export type mute = { date: number, reason?: string, moderator: string, end: number, time: number };
export type ban = { date: number, reason?: string, moderator: string, end?: number, time?: number };

export class ModerationManager {
    constructor(private bot: Bot, public user: UserConfig) { }
    strike(mod: string, reason?: string) {
        this.user.set({ strikes: this.user.strikes.concat({ date: Date.now(), reason: reason || 'No reason specified', moderator: mod }) });
        this.user.getVerified()?.ranked().addElo(-25);
        // this.logStrike((discorduser) => ({ title: `${discorduser.tag} was strikeed`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was strikeed by <@${mod}> (id: \`${mod}\`). \n\nReason: **${reason || 'No Reason Specified'}**\nThey now have **${this.user.strikes.length}** strikes.` }),)
        this.logStrike(mod, reason || 'No Reason Specified')
        this.check();
        return this;
    }
    mute(mod: string, time: number, reason?: string) {
        let options: mute = {
            moderator: mod,
            time: time,
            date: Date.now(),
            end: Date.now() + time,
            reason: reason
        }
        this.user.set({
            mute: options,
            punishmentHistory: this.user.punishmentHistory.concat({ type: 'mute', ...options })
        });
        this.user.resolveMember().then(member => {
            if (!member) return;
            this.user.set({ rolesToReturn: this.user.rolesToReturn?.length ? this.user.rolesToReturn : member.roles.cache.map(r => r.id) });
            member.roles.set([...member.roles.cache.map(r => r.id).filter(r => [this.bot.config.roles.muted, this.bot.config.roles.rankbanned, this.bot.config.roles.banned].includes(r)), this.bot.config.roles.muted]).catch(e => this.bot.log(`&c!!!!! Could not mute user ${this.user.id} (${member.user.username})`));
            // DM User
            member.send({
                embeds: [this.bot.createEmbed()
                    .setTitle(`Punishment Issued`)
                    .setDescription(`Type of Punishment: \`Mute\`.`)
                ]
            }).catch(e => null)
        })
        // this.log((discorduser) => ({ title: `${discorduser.tag} was muted`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was muted by <@${mod}> (id: \`${mod}\`). \n\nReason: **${reason || 'No Reason Specified'}**\nDuration: **${Util.getDateString(time)}**` }),)
        this.log({ offense: "mute", offender: this.user.id, moderator: mod, duration: time, reason: reason || 'No Reason Specified' })

        return this;
    }
    unmute(mod: string, reason?: string) {
        this.user.set({ mute: undefined });
        this.user.resolveMember().then(member => {
            if (!member) return;
            if (this.user.rolesToReturn && !this.user.ban) {
                member.roles.set(this.user.rolesToReturn ?? []).catch(e => this.bot.log(`&c!!!!! Could not unmute user ${this.user.id} (${member.user.username})`));
                this.user.set({ rolesToReturn: undefined });
            } else {
                member.roles.remove(this.bot.config.roles.muted);
            }
            member.send({
                embeds: [this.bot.createEmbed()
                    .setTitle(`Punishment Lifted`)
                    .setDescription(`Punishment Lifted: \`Mute\`.\n\nYou have been unmuted. Enjoy the server!`)
                ]
            }).catch(e => null)
        })
        // this.log((discorduser) => ({ title: `${discorduser.tag} was unmuted`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was unmuted by <@${mod}> (id: \`${mod}\`).\n\nReason: **${reason || 'No Reason Specified'}**` }))
        this.log({ offense: "unmute", offender: this.user.id, moderator: mod, reason: reason || 'No Reason Specified' })
        return this;
    }
    rankBan(mod: string, time: number, reason?: string) {
        let options: ban = {
            moderator: mod,
            date: Date.now(),
            reason: reason,
            time: time,
            end: Date.now() + time
        }
        this.user.set({
            rankBan: options,
            punishmentHistory: this.user.punishmentHistory.concat({ type: 'rankban', ...options })
        });
        this.user.resolveMember().then(member => {
            if (!member) return;
            member.roles.add(this.bot.config.roles.rankbanned).catch(e => this.bot.log(`&c!!!!! Could not rankban user ${this.user.id} (${member.user.username})`));
            this.log({ offense: "rankban", offender: this.user.id, moderator: mod, reason: reason || 'No Reason Specified', duration: time }).then(msg => {
                member.send({
                    embeds: [this.bot.createEmbed()
                        .setTitle(`Punishment Issued`)
                        .setDescription(`You have been \`rank banned\`.`)
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>()
                            .addComponents(
                                new ButtonBuilder()
                                    .setLabel(`View Punishment Details`)
                                    .setURL(msg!.url)
                                    .setStyle(ButtonStyle.Link)
                            )
                    ]
                }).catch(e => null)
            })
        })
        return this;

    }
    rankUnban(mod: string, reason?: string) {
        this.user.set({ rankBan: undefined });
        this.user.resolveMember().then(member => {
            if (!member) return;
            member.roles.remove(this.bot.config.roles.rankbanned);
            member.send({
                embeds: [this.bot.createEmbed()
                    .setTitle(`Punishment Lifted`)
                    .setDescription(`Punishment Lifted: \`Ranked Ban\`.\n\nYou are free to go. Enjoy!`)
                ]
            }).catch(e => null)
        })
        // this.log((discorduser) => ({ title: `${discorduser.tag} was unbanned`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was unbanned by <@${mod}> (id: \`${mod}\`). \n\nReason: **${reason || 'No Reason Specified'}**` }))
        // this.log("unban", this.user.id, mod, 0, reason || 'No Reason Specified')
        this.log({ offense: "rankedunban", offender: this.user.id, moderator: mod, duration: 0, reason: reason || 'No Reason Specified' })
        return this;

    }
    ban(mod: string, reason?: string) {
        let options: ban = {
            moderator: mod,
            date: Date.now(),
            reason: reason
        }
        this.user.set({ ban: options });
        this.user.resolveMember().then(member => {
            if (!member) return;
            this.user.set({ rolesToReturn: this.user.rolesToReturn?.length ? this.user.rolesToReturn : member.roles.cache.map(r => r.id) });
            member.roles.set([...member.roles.cache.map(r => r.id).filter(r => [this.bot.config.roles.muted, this.bot.config.roles.rankbanned, this.bot.config.roles.banned].includes(r)), this.bot.config.roles.banned]).catch(e => this.bot.log(`&c!!!!! Could not ban user ${this.user.id} (${member.user.username})`));
            member.send({
                embeds: [this.bot.createEmbed()
                    .setTitle(`Punishment Updated`)
                    .setDescription(`Type of Punishment Issued: \`Ban\`.\n\nTo view details of your punishment, click on the button in the [here](https://discord.com/channels/${this.bot.mainGuild}/${this.bot.config.channels.jail})`)
                ]
            }).catch(e => null)
        })
        // this.log((discorduser) => ({ title: `${discorduser.tag} was permanently banned`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was banned by <@${mod}> (id: \`${mod}\`). \n\nReason: **${reason || 'No Reason Specified'}**` }))
        this.log({ offense: "ban", offender: this.user.id, moderator: mod, reason: reason || 'No Reason Specified', duration: 0 })
        return this;
    }
    tempBan(mod: string, time: number, reason?: string) {
        let options: ban = {
            moderator: mod,
            date: Date.now(),
            end: Date.now() + time,
            reason: reason,
            time: time
        }
        this.user.set({ ban: options });
        this.user.resolveMember().then(member => {
            if (!member) return;
            this.user.set({ rolesToReturn: this.user.rolesToReturn?.length ? this.user.rolesToReturn : member.roles.cache.map(r => r.id) });
            member.roles.set([...member.roles.cache.map(r => r.id).filter(r => [this.bot.config.roles.muted, this.bot.config.roles.rankbanned, this.bot.config.roles.banned].includes(r)), this.bot.config.roles.banned]).catch(e => this.bot.log(`&c!!!!! Could not ban user ${this.user.id} (${member.user.username})`));
            member.send({
                embeds: [this.bot.createEmbed()
                    .setTitle(`Punishment Updated`)
                    .setDescription(`Type of Punishment Issued: \`Ban\`.`)
                ]
            }).catch(e => null)
        })
        // this.log((discorduser) => ({ title: `${discorduser.tag} was temporarily banned`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was temporarily banned by <@${mod}> (id: \`${mod}\`). \n\nReason: **${reason || 'No Reason Specified'}**\nDuration: **${Util.getDateString(time)}**` }))
        this.log({ offense: "ban", offender: this.user.id, moderator: mod, duration: time, reason: reason || 'No Reason Specified' })
        return this;
    }
    unban(mod: string, reason?: string) {
        this.user.set({ ban: undefined });
        this.user.resolveMember().then(member => {
            if (!member) return;
            if (this.user.rolesToReturn && !this.user.mute) {
                member.roles.set(this.user.rolesToReturn ?? []).catch(e => this.bot.log(`&c!!!!! Could not unban user ${this.user.id} (${member.user.username})`));
                this.user.set({ rolesToReturn: undefined });
            } else {
                member.roles.remove(this.bot.config.roles.banned);
            }
            member.send({
                embeds: [this.bot.createEmbed()
                    .setTitle(`Punishment Lifted`)
                    .setDescription(`Punishment Lifted: \`Server Ban\`.\n\nYou have been unbanned from the server. Enjoy!`)
                ]
            }).catch(e => null)
        })
        // this.log((discorduser) => ({ title: `${discorduser.tag} was unbanned`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was unbanned by <@${mod}> (id: \`${mod}\`). \n\nReason: **${reason || 'No Reason Specified'}**` }))
        // this.log("unban", this.user.id, mod, 0, reason || 'No Reason Specified')
        this.log({ offense: "unban", offender: this.user.id, moderator: mod, duration: 0, reason: reason || 'No Reason Specified' })
        return this;
    }
    liftStrike(mod: string, strikeID: number, reason?: string) {
        let strike = this.user.strikes.splice(strikeID, 1);
        // add back 25
        // this.user.getVerified()?.ranked().addElo(25);
        // this.logStrike((discorduser) => ({ title: `${discorduser.tag} was pardoned.`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was pardoned by <@${mod}> (id: \`${mod}\`) of a strike. \n\nReason: **${reason || 'No Reason Specified'}**` }))
        this.logStrike(mod, reason || 'No Reason Specified', strike[0])
        this.user.set({ strikes: this.user.strikes });
        return this;
    }
    kick(mod: string, reason?: string) {
        // this.user.set({kicked: {} date: Date.now(), reason: reason, moderator:mod });
        // this.logStrike((discorduser) => ({ title: `${discorduser.tag} was kicked`, description: `<@${this.user.id}> (id: \`${this.user.id}\`) was kicked by <@${mod}> (id: \`${mod}\`). \n\nReason: **${reason || 'No Reason Specified'}**` }))
        this.bot.getMainGuild()!.members.kick(this.user.id);

        return this;
    }
    public async check() {
        const strikes = this.user.strikes;
        let bantime: string | null = null;
        switch (strikes.length) {
            case 2:
                bantime = '3h';
                break;
            case 3:
                bantime = '6h';
                break;
            case 4:
                bantime = '12h';
                break;
            case 5:
                bantime = '24h';
                break;
            case 6:
                bantime = '3d';
                break;
            case 7:
                bantime = '7d';
                break;
            case 8:
                bantime = '14d';
                break;
        }

        if (bantime) {
            const time = Util.parseTime(bantime)?.ms || 30 * 60 * 1000;
            this.user.moderate().rankBan(this.bot.user!.id, time, `Automated ranked ban: User has ${strikes.length} strikes`)
        }
        // check for mute
        if (this.user.strikes.length % 3) {
            // this.bot.log(`[Moderation] Muting user ${this.user.id} for ${this.user.strikes.length} strikes`);
            // this.user.moderate().mute(this.bot.user!.id, 7 * 24 * 60 * 60 * 1000, `Automated mute: User had 3 strikes`);
        }

    }
    public async logStrike(moderator: string, reason: string, liftStrike?: strike) {
        let channel = await this.bot.parseChannel(this.bot.config.channels.moderation, this.bot.getMainGuild()!) as TextChannel;
        if (channel) {
            let discordUser = await this.user.resolveDiscord();
            if (discordUser) {
                const fields = [
                    { name: "Reason", value: `**\`${reason}\`**`, inline: true },
                    { name: "Total strikes", value: `${this.user.strikes.length}`, inline: true }
                ];
                if (liftStrike) fields.unshift({ name: `Strike that was lifted`, value: `**\`${liftStrike.reason}\`**`, inline: true })
                this.bot.createEmbed()
                    .setColor(liftStrike ? 'DarkGreen' : "Yellow")
                    .setContent(`<@${discordUser.id}>`)
                    .setThumbnail(this.bot.getMainGuild()!.iconURL()!)
                    .setAuthor({ name: `Ranked Bedwars Moderation | Strike ${liftStrike ? 'Lifted' : 'Issued'}` })
                    .setDescription(`
${liftStrike ? 'Lifted By:' : `Issued By:`} <@${moderator}>
On: <@${this.user.id}>`)
                    .addFields(fields)
                    .setFooter({ text: `discord.gg/compbw` })
                    .setTimestamp()
                    .send(channel)
            }
        }
    }
    public async log(options: { offense: "rankban" | "rankedunban" | "ban" | "mute" | "unban" | "unmute", offender: string, moderator: string, duration?: number, reason?: string }) {
        let channel = await this.bot.parseChannel(this.bot.config.channels.moderation, this.bot.getMainGuild()!) as TextChannel;
        if (channel) {
            let discordUser = await this.user.resolveDiscord();
            if (discordUser) {
                let fields: EmbedField[] = [];
                if (options.offender) fields.push({ name: "User", value: `<@${options.offender}>`, inline: true });
                if (options.moderator) fields.push({ name: "Moderator", value: `<@${options.moderator}>`, inline: true });
                if (options.duration !== undefined) fields.push({ name: "Duration", value: !options.duration ? `Permanent` : Util.getDateString(options.duration), inline: true });
                if (options.duration) fields.push({ name: "Expiry", value: `${Util.getDiscordTimeFormat(options.duration + Date.now(), "D")} ( ${Util.getDiscordTimeFormat(options.duration + Date.now(), "R")} )`, inline: true });
                fields.push({ name: "Reason", value: `**\`${options.reason || 'No Reason Specified'}\`**`, inline: true });
                return this.bot.createEmbed()
                    .setContent(`<@${discordUser.id}>`)
                    .setAuthor({ name: `Ranked Bedwars Moderation | Punishment Updated` })
                    .setThumbnail(this.bot.getMainGuild()!.iconURL()!)
                    .setColor(['rankban', 'ban', 'mute'].includes(options.offense) ? '#000000' : 'DarkGreen')
                    .setDescription(
                        options.offense === 'rankban' ?
                            `You have been ranked banned for breaking server rules`
                            : options.offense === 'ban' ?
                                `You have been banned for breaking server rules`
                                : options.offense === 'mute' ?
                                    `You have been muted for breaking server rules`
                                    : options.offense === 'unban' ?
                                        `You have been unbanned, Feel free to play now!`
                                        : options.offense === 'unmute' ?
                                            `You have been unmuted`
                                            : `You have been ranked unbanned, Feel free to play now!`
                    )
                    .addFields(fields)
                    .setFooter({ text: `discord.gg/compbw` })
                    .setTimestamp()
                    // .setAuthor({ name: title, iconURL: discordUser.avatarURL()! })
                    // .setDescription(description)
                    // .setFooter({ text: `ranked revolution | moderation` })
                    // .setTimestamp()
                    .send(channel)
            }
        }
    }
}