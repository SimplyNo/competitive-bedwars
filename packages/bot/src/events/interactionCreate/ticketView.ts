import { APIButtonComponent, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, ComponentType, TextInputBuilder } from "discord.js";
import { Event } from "../../types";
import { ModalBuilder } from "@discordjs/builders";
const existingTimeouts = new Collection<string, NodeJS.Timeout>();
export default {
    name: "interactionCreate",
    async run(bot, interaction) {
        if (!interaction.isButton()) return;
        const { customId, member } = interaction;

        const [check, ticketID, channelID, messageID] = customId.split('-');
        if (check !== 'ticketview') return;
        const ticket = bot.getMainServerConfig().ticketManager().getTicketByID(parseInt(ticketID));
        if (!ticket) return bot.createErrorEmbed(interaction).setDescription(`Failed to find ticket.`).send()
        const channel = await bot.channels.fetch(channelID).catch(e => null);
        if (!channel || !channel.isTextBased()) return bot.createErrorEmbed(interaction).setDescription(`Failed to find transcript channel.`).send()
        const message = await channel.messages.fetch(messageID).catch(e => null);
        if (!message) return bot.createErrorEmbed(interaction).setDescription(`Failed to find transcript message.`).send()
        const link = `https://mahto.id/chat-exporter?url=${message.attachments.first()?.url}`;
        interaction.reply({
            content: `[Transcript Loaded!](${link})`,
            ephemeral: true
        })
        interaction.message.edit({
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder(interaction.message.components[0].components[0].toJSON() as APIButtonComponent),
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Link)
                        .setURL(link)
                        .setLabel(`Open Transcript #${ticket.id}`)
                )
            ]
        }).catch(e => console.error(`error while loading ticket transcript #${ticket.id}`, e))
        if (!existingTimeouts.has(interaction.message.id)) existingTimeouts.set(interaction.message.id, setTimeout(() => {
            console.log(`[DELETING]`, interaction.message.id)
            interaction.message.edit({
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        new ButtonBuilder(interaction.message.components[0].components[0].toJSON() as APIButtonComponent),
                    )
                ]
            })
            existingTimeouts.delete(interaction.message.id);
        }, 5 * 60 * 1000))
    },
} as Event<"interactionCreate">