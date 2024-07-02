import { Collection } from "discord.js";
import { CommandContext, Event } from "../../types";
import { Util } from "../../util/Util";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
const cooldowns = new Collection<string, Collection<string, number>>();

export default {
    name: "interactionCreate",
    once: false,
    async run(bot, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.inCachedGuild()) return;
        const [check, roleID] = interaction.customId.split('-');
        if (check !== 'autorole') return;
        const role = interaction.guild.roles.cache.get(roleID);
        if (!role) return console.error(`could not find autorole role ${roleID}!`);
        if (interaction.member.roles.cache.has(roleID)) {
            interaction.member.roles.remove(roleID).catch(e => null);
            interaction.reply({ embeds: [bot.createErrorEmbed().setDescription(`Removed <@&${roleID}>!`)], ephemeral: true });
        } else {
            interaction.member.roles.add(roleID).catch(e => null);
            interaction.reply({ embeds: [bot.createEmbed().setDescription(`You have been given <@&${roleID}>!`)], ephemeral: true });
        }

    }

} as Event<"interactionCreate">