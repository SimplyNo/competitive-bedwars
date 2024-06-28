import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageCreateOptions, TextInputBuilder, TextInputStyle } from "discord.js";
import { Event } from "../../types";
import { ModalBuilder } from "@discordjs/builders";

export default {
    name: "interactionCreate",
    async run(bot, interaction) {
        if (!interaction.isButton() || !interaction.inGuild() || !interaction.inCachedGuild()) return;
        const serverConf = bot.getServerConfig(interaction.guild.id);
        const tickets = serverConf.ticketManager();
        const { customId, member } = interaction;

        const [check, action, ticketID] = customId.split('-');
        if (check !== 'screenshare' || !['claim', 'delete', 'close'].includes(action)) return;
        const ticket = tickets.getTicketByID(parseInt(ticketID));
        console.log(ticketID, customId)
        if (!ticket) return interaction.reply({ content: 'Ticket not found!', ephemeral: true });
        const accused = bot.getUser(ticket.users[1]);
        if (!accused) return interaction.reply({ content: 'Error: could not find the person to screen share, please contact a developer.', ephemeral: true });
        const accusedMember = await accused.resolveMember();

        if (action === 'close') {
            if (!ticket.active) return interaction.reply({ content: 'Ticket is already closed!', ephemeral: true });
            if (ticket.controlMessageId === interaction.message.id) {
                interaction.message.edit({
                    components: []
                })
            }
            // remove freeze role
            await accusedMember?.roles.remove(bot.config.roles.frozen);

            ticket.lock(member);

        } else if (action === 'claim') {
            interaction.message.edit({
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents([
                            new ButtonBuilder()
                                .setLabel('Close Request')
                                .setEmoji('🔒')
                                .setCustomId('screenshare-close-' + ticket.id)
                                .setStyle(ButtonStyle.Secondary)
                        ])
                ]
            }).catch(e => null);
            interaction.reply({
                embeds: [
                    bot.createEmbed()
                        .setDescription(`Screenshare request claimed by ${member}.`)
                ]
            })
            await accusedMember?.roles.add(bot.config.roles.frozen);
            const dmMsg: MessageCreateOptions = {
                embeds: [
                    {
                        description: `You are now frozen in Competitive Bedwars for \`${ticket.reason}\`. You now have **5 minutes** to send the AnyDesk code in <#${ticket.channelId}>. If not, you will be banned for 3 days for stalling.`
                    }
                ]
            }
            bot.getMainServerConfig().ticketManager().updateTicket(ticket.id, { claimedBy: member.id });
            bot.api.screenshare.send('send', { user: accused.id, message: dmMsg }).then(async (res) => {
                console.log(`res:`, res);
                if (!res || !res.success) (accusedMember?.user)?.send(dmMsg);
            })
        } else if (action === 'delete') {
            if (!bot.config.tickets.allowedRoles.includes(member.roles.highest.id) && !member.permissions.has('Administrator')) return interaction.reply({ content: `You can't do that!`, ephemeral: true })
            ticket.delete(member);
        }
        if (!interaction.replied) interaction.deferUpdate();
    },
} as Event<"interactionCreate">