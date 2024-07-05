import { GuildMember, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextBasedChannel, BaseMessageOptions, GuildTextBasedChannel, TextChannel, OverwriteType } from "discord.js";
import { Bot } from "../../Bot";
import { NonFunctionProperties, ServerConfig } from "../../types/config/ServerConfig";
import { Util } from "../../util/Util";
import { TicketManager, } from "./TicketManager";
import discordTranscripts, { ExportReturnType } from "discord-html-transcripts";
export type RawTicket = Pick<Ticket, Exclude<NonFunctionProperties<Ticket>, undefined>>

export class Ticket {
    private manager: TicketManager;
    active: boolean;
    channelId?: string | undefined;
    controlMessageId?: string | undefined;
    created: number;
    id: number;
    lastLockMessageId?: string | undefined;
    name: string;
    createdBy: string;
    users: string[];
    allowedRoles: string[] = [];
    reason?: string;
    claimedBy?: string;
    constructor(private bot: Bot, private serverConfig: ServerConfig, options: RawTicket) {
        this.manager = this.serverConfig.ticketManager();
        Object.assign(this, options);
    }
    public toJSON(): RawTicket {
        const excludeKeys = ['bot', 'manager', 'serverConfig']; // add keys to exclude here
        return <RawTicket>Object.entries(this)
            .filter(([key, value]) => typeof value !== 'function' && !excludeKeys.includes(key) && value !== undefined)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
    }
    public async setName(name: string) {
        this.name = name;
        const channel = await this.bot.parseChannel(this.channelId, this.bot.getMainGuild()!) as TextChannel;
        if (!channel || !channel.isTextBased()) return;
        channel.setName(name);
        this.manager.updateTicket(this.id, { name: name });
    }
    public async setRolePerms(role: string) {
        const channel = (await this.bot.parseChannel(this.channelId, this.bot.getMainGuild()!)) as TextChannel;
        if (!channel || !channel.isTextBased()) return;
        channel.permissionOverwrites.set(
            [
                // ...(channel.permissionOverwrites.cache.filter(u => !this.users.includes(u.id)).values()),
                {
                    id: role,
                    type: OverwriteType.Role,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                },
                {
                    id: this.bot.getMainGuild()?.roles.everyone!,
                    type: OverwriteType.Role,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                ...this.users.map(u => ({
                    id: u,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                }))
            ]
        )
    }
    public async addUser(user: string) {
        this.users.push(user);
        this.manager.updateTicket(this.id, { users: this.users });
        const channel = await this.bot.parseChannel(this.channelId, this.bot.getMainGuild()!) as TextChannel;
        if (!channel || !channel.isTextBased()) return;
        channel.edit({
            permissionOverwrites: [
                ...channel.permissionOverwrites.cache.values(),
                {
                    id: user,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                }
            ]
        })
    }
    public async removeUser(user: string) {
        this.users = this.users.filter(m => m != user);
        this.manager.updateTicket(this.id, { users: this.users });
        console.log(this.users, user)
        const channel = (await this.bot.parseChannel(this.channelId, this.bot.getMainGuild()!)) as TextChannel;
        if (!channel || !channel.isTextBased()) return;
        channel.edit({
            permissionOverwrites: [
                ...(channel.permissionOverwrites.cache.filter(u => u.id !== user).values()),
            ]
        })
    }

    public async lock(member: GuildMember) {
        const channel = await this.bot.parseChannel(this.channelId, member.guild);
        if (!channel || !channel.isTextBased()) return;
        this.manager.updateTicket(this.id, { active: false });

        channel.edit({
            permissionOverwrites: [
                ...(this.bot.config.tickets.allowedRoles.map(r => ({
                    id: r,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                }))),
                {
                    id: member.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                ...this.users.map(u => ({
                    id: u,
                    deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                }))

            ]
        }).catch(e => console.log('erroed:',
            [
                ...(this.bot.config.tickets.allowedRoles.map(r => ({
                    id: r,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                }))),
                {
                    id: member.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                ...this.users.map(u => ({
                    id: u,
                    deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                }))
            ]))
        const user = await this.bot.getUser(this.createdBy).resolveDiscord();
        const attachment = await discordTranscripts.createTranscript<ExportReturnType.Attachment>(channel, { returnType: ExportReturnType.Attachment, saveImages: true }).catch(e => null);
        if (!attachment) return;
        const transcriptChannel = await this.bot.parseChannel(this.bot.config.channels.ticketLogsTranscript, this.bot.getStaffGuild()!);
        const transcript = await transcriptChannel?.send({ content: `#${this.id}, closed by ${member.user.username}`, files: [attachment.setSpoiler()] });
        const msg = await user?.send({
            embeds: [
                this.bot.createEmbed()
                    .setTitle(`RBW Ticket Closed.`)
                    .setDescription(`Your ticket, **${this.name}** has been closed by ${member}.`)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(`ticketview-${this.id}-${transcriptChannel?.id}-${transcript?.id}`)
                        .setLabel('Load Transcript')
                )
            ]
        }).catch(e => console.error(`Failed to DM ${user.username} about ticket being locked.`))

        console.log(msg?.attachments.first()?.url)
        this.updateLockMessage(channel, {
            embeds: [
                this.bot.createEmbed()
                    .setDescription(`Ticket closed by ${member}.`)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setLabel('Open')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('🔓')
                            .setCustomId(`ticket-unlock-${this.id}`),
                        new ButtonBuilder()
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger)
                            .setCustomId(`ticket-delete-${this.id}`)
                    ])
            ]
        });
    }
    public async unlock(member: GuildMember) {
        const channel = await this.bot.parseChannel(this.channelId, member.guild);
        if (!channel || !channel.isTextBased()) return;
        this.manager.updateTicket(this.id, { active: true });

        channel.edit({
            permissionOverwrites: [
                ...this.bot.config.tickets.allowedRoles.map(r => ({
                    id: r,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                })),
                ...this.allowedRoles.map(r => ({
                    id: r,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                })),
                {
                    id: member.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                ...this.users.map(u => ({
                    id: u,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                }))
            ]
        })
        this.updateLockMessage(channel, {
            embeds: [
                this.bot.createEmbed()
                    .setDescription(`Ticket opened by ${member}.`)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(new ButtonBuilder()
                        .setLabel('Close')
                        .setEmoji('🔒')
                        .setStyle(ButtonStyle.Secondary)
                        .setCustomId(`ticket-lock-${this.id}`))
            ]
        });
    }
    public async delete(member: GuildMember) {
        const channel = await this.bot.parseChannel(this.channelId, member.guild);
        if (!channel || !channel.isTextBased()) return;

        const msgOptions = (sec: number) => ({
            embeds: [
                this.bot.createEmbed()
                    .setDescription(`This ticket channel will be deleted and archived in **${sec} second(s)**...`)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .setComponents([
                        new ButtonBuilder()
                            .setCustomId('cancel')
                            .setLabel('Cancel')
                            .setStyle(ButtonStyle.Danger)
                    ])
            ]
        })
        let deleted = false;
        let toDelete = true;
        const msgToEdit = await channel.send(msgOptions(5));
        const collector = msgToEdit.createMessageComponentCollector();
        collector.on('collect', (btn) => {
            if (!deleted && btn.customId === 'cancel') {
                toDelete = false;
                msgToEdit.edit({
                    embeds: [
                        this.bot.createEmbed()
                            .setDescription(`Ticket deletion cancelled.`)
                    ],
                    components: []
                })
                btn.reply({
                    content: "Cancelled.", ephemeral: true
                })
            }
        })
        toDelete && await Util.wait(1000);
        toDelete && await msgToEdit.edit(msgOptions(4)).catch(e => null);
        toDelete && await Util.wait(1000);
        toDelete && await msgToEdit.edit(msgOptions(3)).catch(e => null);
        toDelete && await Util.wait(1000);
        toDelete && await msgToEdit.edit(msgOptions(2)).catch(e => null);
        toDelete && await Util.wait(1000);
        toDelete && await msgToEdit.edit(msgOptions(1)).catch(e => null);
        toDelete && await Util.wait(1000);
        toDelete && await msgToEdit.edit(msgOptions(0)).catch(e => null);
        toDelete && await Util.wait(1000); 0
        toDelete && await msgToEdit.edit({ embeds: [this.bot.createEmbed().setDescription(`Deleting...`)] }).catch(e => null);
        if (toDelete) {
            const attachment = await discordTranscripts.createTranscript<ExportReturnType.Attachment>(channel, { returnType: ExportReturnType.Attachment }).catch(e => null);

            if (attachment) {
                const transcriptChannel = await this.bot.parseChannel(this.bot.config.channels.ticketLogsTranscript, this.bot.getStaffGuild()!);
                const transcript = await transcriptChannel?.send({ content: `#${this.id}, deleted by ${member.user.username}`, files: [attachment.setSpoiler()] });
                this.bot.logger.log(this.bot.config.channels.ticketLogs, {
                    embeds: [
                        this.bot.createEmbed()
                            .setTitle(`Ticket ${this.id} Deleted`)
                            .setDescription(`\`•\` Name: ${this.name}\n\`•\` Created by <@${this.createdBy}>\n\`•\` Deleted by ${member}\n\`•\` Created: ${Util.getDiscordTimeFormat(this.created, "R")}`)
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`ticketview-${this.id}-${transcriptChannel?.id}-${transcript?.id}`)
                                .setStyle(ButtonStyle.Primary)
                                .setLabel('Load Transcript')
                        )
                    ]
                });
                this.bot.api.workers.deleteChannel(channel.id);
            }
        }
    }
    // public async sendLockMessage(ticket: Ticket, channel: TextBasedChannel, options: BaseMessageOptions) {
    //     const msg = await channel.send(options);
    //     this.
    // }
    public async updateLockMessage(channel: TextBasedChannel, options: BaseMessageOptions) {
        if (this.lastLockMessageId) {
            const oldLockMessage = await channel.messages.fetch(this.lastLockMessageId).catch(e => null);
            if (oldLockMessage) {
                await oldLockMessage.edit({ components: [] });
            }
        }
        const newLockMessage = await channel.send(options);
        this.manager.updateTicket(this.id, { lastLockMessageId: newLockMessage.id })
    }
}