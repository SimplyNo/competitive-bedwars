import { APIButtonComponent, ActionRowBuilder, ButtonBuilder, Collection } from "discord.js";
import { CommandContext, Event } from "../../types";
import { Util } from "../../util/Util";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
const cooldowns = new Collection<string, Collection<string, number>>();

export default {
    name: "interactionCreate",
    once: false,
    async run(bot, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.inCachedGuild()) return;
        if (interaction.guild.id !== bot.staffGuild) return;
        if (!interaction.customId.startsWith(`sr-`)) return;
        const [_, type, user, requester, channelID, messageID] = interaction.customId.split('-');
        const userconfig = bot.getUser(user);
        const requesterconfig = bot.getUser(requester);
        const channel = await bot.parseChannel(channelID, bot.getMainGuild()!);
        const message = await channel?.messages.fetch(messageID);
        const moderator = interaction.member;
        if (type === 'accept') {
            userconfig.moderate().strike(moderator.id, `Strike Request by ${requesterconfig.username} accepted. ${message?.url || ''}`);
            message?.reply({ embeds: [bot.createEmbed().setDescription(`Strike request against <@${user}> has been accepted.`).setColor('Green')] })
            interaction.reply({ content: `Strike has been issued!`, ephemeral: true });
            interaction.message.edit({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder(interaction.message.components[0].components.find(e => e.customId?.includes(type))!.toJSON() as APIButtonComponent).setLabel(`Accepted by ${interaction.member.user.tag}`).setDisabled(true)), interaction.message.components[1]] })
        } else if (type === 'deny') {
            message?.reply({ embeds: [bot.createEmbed().setDescription(`Strike request against <@${user}> has been denied.`).setColor('Red')] })
            interaction.reply({ content: `Request denied!`, ephemeral: true })
            interaction.message.edit({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder(interaction.message.components[0].components.find(e => e.customId?.includes(type))!.toJSON() as APIButtonComponent).setLabel(`Denied by ${interaction.member.user.tag}`).setDisabled(true)), interaction.message.components[1]] })

        }

    }

} as Event<"interactionCreate">