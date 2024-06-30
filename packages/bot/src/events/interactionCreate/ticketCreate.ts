import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, Collection, EmbedField, PermissionFlagsBits } from "discord.js";
import { CommandContext, Event } from "../../types";
import { Util } from "../../util/Util";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
import { Ticket } from "../../core/tickets/Ticket";
const cooldowns = new Collection<string, Collection<string, number>>();

export default {
    name: "interactionCreate",
    once: false,
    async run(bot, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.inCachedGuild()) return;
        if (interaction.guild.id !== bot.mainGuild) return;
        const verifiedUser = bot.getVerifiedUser({ id: interaction.user.id });
        const [check, action, type] = interaction.customId.split('-');
        if (check !== 'ticket' || action !== 'create') return;
        const userConfig = bot.getUser(interaction.user.id);
        const serverConfig = bot.getServerConfig(interaction.guild.id);
        let name = 'ticket', allowedRoles: string[] = [], content = "", message = "", title = "", category = "";
        if (type === 'general') {
            name = 'general';
            title = 'General Ticket';
            content = `<@&${bot.config.roles.staff}>`
            category = bot.config.channels.ticketGeneralCategory;
        } else if (type === 'scoring') {
            name = 'scoring';
            title = 'Scoring Ticket';
            content = `<@&${bot.config.roles.staff}>`
            category = bot.config.channels.ticketScoringCategory;
        } else if (type === 'appeal') {
            name = 'appeal';
            title = 'Appeal Ticket';
            content = `<@&${bot.config.roles.staff}>`
            category = bot.config.channels.ticketAppealsCategory;
        }
        interaction.reply({ content: `Creating a new **${name} ticket**...`, ephemeral: true })
        const ID = serverConfig.tickets.length + 1;
        const ticket = new Ticket(bot, serverConfig, {
            active: true,
            created: Date.now(),
            createdBy: interaction.user.id,
            users: [interaction.user.id],
            id: ID,
            name: `${name}-${ID}`,
            allowedRoles: allowedRoles
        })
        serverConfig.ticketManager().createTicket(ticket);
        // create channel
        console.log(allowedRoles);
        const channel = await interaction.guild.channels.create({
            name: ticket.name,
            type: ChannelType.GuildText,
            parent: category,
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
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.guild.roles.everyone,
                    deny: [PermissionFlagsBits.ViewChannel]
                }
            ],
        })

        const ctrlmsg = await channel.send({
            content: `${content} ${interaction.user}, a new ticket has been created!`,
            embeds: [
                bot.createEmbed()
                    .setTitle(`${Util.capitalizeFirstLetter(verifiedUser?.username ? `${verifiedUser.username}` : interaction.user.username)}'s ${title}`)
                    .setDescription(`Welcome to your new ticket room, ${interaction.user}!\n\n${message ? `**${message}**` : ''}`)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setLabel('Close')
                            .setEmoji('🔒')
                            .setCustomId('ticket-lock-' + ID)
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        });
        serverConfig.ticketManager().updateTicket(ID, { channelId: channel.id, controlMessageId: ctrlmsg.id });
        interaction.editReply({ content: `Ticket created in ${channel}!`, components: [] });

    }
} as Event<"interactionCreate">