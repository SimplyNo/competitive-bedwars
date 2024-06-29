import { AutocompleteInteraction, CacheType, InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class UnfreezeCommand extends SlashCommand {
    constructor() {
        super({
            name: "unfreeze",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("unfreeze")
                .setDescription("Unfreeze a user")
                .addUserOption(subcmd =>
                    subcmd
                        .setName("user")
                        .setDescription("The user to unfreeze")
                        .setRequired(true))
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const member = interaction.options.get("user", true).member!;
        if (!member) return interaction.reply({ content: "Invalid user", ephemeral: true });
        const roles = member.roles.cache;
        const { frozen } = bot.config.roles;
        if (!roles.has(frozen)) return bot.createErrorEmbed(interaction).setDescription(`${member} is not frozen.`).send();
        await member.roles.remove(bot.config.roles.frozen);
        return bot.createSuccessEmbed(interaction)
            .setDescription(`${member} has been unfrozen.`).send();
    }
}
