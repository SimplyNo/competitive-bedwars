import { Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class StrikeCommand extends SlashCommand {
    constructor() {
        super({
            name: "strike",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("strike")
                .setDescription("Strike a player")
                .addUserOption(subcmd =>
                    subcmd
                        .setName("user")
                        .setDescription("The user to strike")
                        .setRequired(true))
                .addStringOption(subcmd =>
                    subcmd
                        .setName("reason")
                        .setDescription("The reason for the strike")
                        .setRequired(true)
                )
        });
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        const user = interaction.options.get("user", true).user!;
        const reason = interaction.options.get("reason", true).value as string;
        const userconfig = bot.getUser(user.id);
        userconfig.moderate().strike(interaction.user.id, reason);
        return bot.createEmbed(interaction)
            .setColor('Yellow')
            .setContent(`<@${user.id}>`)
            .setFooter({ text: `Punishment issued by ${interaction.user.username}` }).setTimestamp()
            .setDescription(`Issued \`1\` strike to **${user?.username}** for *${reason}*\n\nThey now have \`${userconfig.strikes.length}\` strikes.`).send();

    }
}