import { InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Util } from "../../util/Util";

export default class RankedBanCommand extends SlashCommand {
    constructor() {
        super({
            name: "rankedban",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("rankedban")
                .setDescription("Ranked ban command")
                .addUserOption(subcmd =>
                    subcmd
                        .setName("user")
                        .setDescription("The user to rankban")
                        .setRequired(true))
                .addStringOption(subcmd =>
                    subcmd
                        .setName("duration")
                        .setDescription("Duration of the rankban. Example: 1h, 1h30m, 1w, 1m, 1y")
                        .setRequired(true)
                )
                .addStringOption(subcmd =>
                    subcmd
                        .setName("reason")
                        .setDescription("The reason for the rankban")
                        .setRequired(true)
                )
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const user = interaction.options.get("user", true).user!;
        const duration = Util.parseTime(interaction.options.get("duration", true).value as string);
        const reason = interaction.options.get("reason", true).value as string;
        const userconfig = bot.getUser(user.id);
        if (!duration) return interaction.reply({ content: `Failed to parse duration "${interaction.options.get("duration", true).value}". \n\nExample: \`1h\`, \`1h30m\`, \`7d\``, ephemeral: true })
        userconfig.moderate().rankBan(interaction.user.id, duration?.ms, reason);
        return bot.createEmbed(interaction)
            .setColor('Red')
            .setContent(`<@${user.id}>`)
            .setFooter({ text: `Punishment issued by ${interaction.user.username}` }).setTimestamp()
            .setDescription(`**${user?.username}** has been **ranked banned** for \`${duration.string}\` for *${reason}*`).send();
    }
}