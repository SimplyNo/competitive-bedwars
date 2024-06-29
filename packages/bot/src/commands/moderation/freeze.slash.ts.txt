import { AutocompleteInteraction, CacheType, InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class FreezeCommand extends SlashCommand {
    constructor() {
        super({
            name: "freeze",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("freeze")
                .setDescription("Freeze a user from queueing")
                .addUserOption(subcmd =>
                    subcmd
                        .setName("user")
                        .setDescription("The user to freeze")
                        .setRequired(true))
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const member = interaction.options.get("user", true).member!;
        if (!member) return interaction.reply({ content: "Invalid user", ephemeral: true });
        const roles = member.roles.cache;
        const { frozen } = bot.config.roles;
        if (roles.has(frozen)) return bot.createErrorEmbed(interaction).setDescription(`${member} is already frozen.`).send();
        await member.roles.add(bot.config.roles.frozen);
        return bot.createSuccessEmbed(interaction)
            .setDescription(`${member} has been frozen.`).send();
    }
}
