import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Collection, Message, PermissionFlagsBits } from "discord.js"
import { Command, CommandContext } from "../../types"
import { cpuUsage, } from "os-utils";
import { Util } from "../../util/Util";
import { Ticket } from "../../core/tickets/Ticket";
import { setCommandCooldown } from "../../events/messageCreate";
const voided = new Collection<number, string>();
export default class ScreenshareCommand extends Command {
    constructor() {
        super({
            name: 'screenshare',
            description: 'Submit a screen share request.',
            aliases: ['ss'],
            usage: `[user] [reason]`
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig: verifiedUser }: CommandContext): Promise<void | Message<boolean>> {
        if (!args.length) return bot.createErrorEmbed(message).setDescription(`Command usage: \`=ss ${this.usage}\` with attached image of "don't log" being sent in chat.`).send()
        const user = await bot.parseMember(args[0], message.guild);
        const reason = args.slice(1).join(' ');
        const attachment = message.attachments.first();
        if (!user) return bot.createErrorEmbed(message).setDescription(`You must provide a user to screenshare with.`).send();
        const userVerified = bot.getVerifiedUser({ id: user.id });
        if (user.id === message.author.id) return bot.createErrorEmbed(message).setDescription(`You can't screenshare yourself.`).send();
        if (!userVerified) return bot.createErrorEmbed(message).setDescription(`The user you are trying to screenshare is not verified.`).send();
        if (!reason) return bot.createErrorEmbed(message).setDescription(`You must provide a reason for the screenshare.`).send();
        if (!attachment) return bot.createErrorEmbed(message).setDescription(`You must attach an image of "don't log" being sent in chat.`).send();
        setCommandCooldown('screenshare', message.author.id, 60 * 1000);
        message.react('✅');
        const ID = (serverConf.tickets?.length || 0) + 1;
        const allowedRoles = [bot.config.roles.screensharer];
        const ticket = new Ticket(bot, bot.getMainServerConfig(), {
            active: true,
            users: [message.author.id, user.id],
            allowedRoles,
            created: Date.now(),
            createdBy: message.author.id,
            id: ID,
            name: `ss-${user.user.username}`,
            reason
        });
        bot.getMainServerConfig().ticketManager().createTicket(ticket)

        const channel = await message.guild.channels.create({
            name: ticket.name,
            type: ChannelType.GuildText,
            parent: bot.config.channels.ticketCategory,
            permissionOverwrites: [
                ...bot.config.tickets.allowedRoles.map(r => ({
                    id: r,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                })),
                ...allowedRoles.map(r => ({
                    id: r,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                })),
                {
                    id: message.author.id,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                },
                {
                    id: message.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ],
        })


        const ctrlmsg = await channel.send({
            content: `<@&${bot.config.roles.screensharer}> ${user} ${message.author}, a new ticket has been created!`,
            embeds: [
                bot.createEmbed()
                    .setTitle(`${Util.capitalizeFirstLetter(verifiedUser?.username ? `${verifiedUser.username}` : message.author.username)}'s Screenshare Request`)
                    .setDescription(`Screenshare request opened by ${message.author} against ${user}.\n\n**Reason:** ${reason}\n\nThis ticket will automatically close in **15 minutes** if not claimed.`)
                    .setImage(attachment.url)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setLabel('Claim')
                            .setEmoji('🔒')
                            .setCustomId('screenshare-claim-' + ID)
                            .setStyle(ButtonStyle.Success)
                    ]),
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setLabel('Close Request')
                            .setEmoji('🔒')
                            .setCustomId('screenshare-close-' + ID)
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        });
        setTimeout(async () => {
            const ticket = bot.getMainServerConfig().ticketManager().getTicketByID(ID);
            if (!ticket) return;
            if (!ticket.claimedBy) {
                ctrlmsg.edit({
                    components: []
                })
                await channel.send({
                    embeds: [
                        bot.createEmbed()
                            .setDescription(`Screenshare request was not claimed in time and has been closed.`)
                    ]
                })
                ticket.lock(await bot.getMainGuild()?.members.fetchMe()!);
            }
        }, 15 * 60 * 1000);
        bot.getMainServerConfig().ticketManager().updateTicket(ID, { channelId: channel.id, controlMessageId: ctrlmsg.id });
    }
}
