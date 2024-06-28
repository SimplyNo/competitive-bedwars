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
        if (!interaction.isAutocomplete()) return;
        if (!interaction.inCachedGuild()) return;
        if (interaction.guild.id !== bot.mainGuild) return;

        const command = bot.slashCommands.get(interaction.commandName);
        if (!command) return;
        const context = new AutoCompleteContext(bot, interaction);
        command.autocomplete(context);
    }

} as Event<"interactionCreate">