import { ActionRowBuilder, ComponentType, TextInputBuilder } from "discord.js";
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
        if (check !== 'ticket' || !['unlock', 'delete', 'lock'].includes(action)) return;
        const ticket = tickets.getTicketByID(parseInt(ticketID));
        console.log(ticketID, customId)
        if (!ticket) return interaction.reply({ content: 'Ticket not found!', ephemeral: true });
        if (action === 'lock') {
            if (!ticket.active) return interaction.reply({ content: 'Ticket is already closed!', ephemeral: true });
            if (ticket.controlMessageId === interaction.message.id) {
                interaction.message.edit({
                    components: []
                })
            }
            // await interaction.showModal(
            //     new ModalBuilder()
            //         .setCustomId('ticket-lock')
            //         .addComponents([
            //             new ActionRowBuilder<TextInputBuilder>()
            //                 .addComponents([
            //                     new TextInputBuilder()
            //                         .setPlaceholder('Reason')
            //                         .setCustomId('ticket-lock-reason')
            //                         .setRequired(true)
            //                 ])
            //         ]))
            // const resp = await interaction.awaitModalSubmit({ time: 60000 });
            // if (!resp) return interaction.reply({ content: 'Ticket lock timed out!', ephemeral: true });
            // const reason = resp.fields.getField('ticket-lock-reason');

            ticket.lock(member);

        } else if (action === 'unlock') {
            if (ticket.active) return interaction.reply({ content: 'Ticket opened!', ephemeral: true });
            ticket.unlock(member);
        } else if (action === 'delete') {
            if (!bot.config.tickets.allowedRoles.includes(member.roles.highest.id) && !member.permissions.has('Administrator')) return interaction.reply({ content: `You can't do that!`, ephemeral: true })
            ticket.delete(member);
        }
        interaction.deferUpdate();
    },
} as Event<"interactionCreate">