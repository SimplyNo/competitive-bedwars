import { InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Util } from "../../util/Util";

export default class RankedUnbanCommand extends SlashCommand {
    constructor() {
        super({
            name: "rankedunban",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("rankedunban")
                .setDescription("ranked unban command")
                .addUserOption(subcmd =>
                    subcmd
                        .setName("user")
                        .setDescription("The user to rank unban")
                        .setRequired(true))
                .addStringOption(subcmd =>
                    subcmd
                        .setName("reason")
                        .setDescription("The reason for the rank unban")
                        .setRequired(true)
                )
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const user = interaction.options.get("user", true).user!;
        const reason = interaction.options.get("reason", true).value as string;
        const userconfig = bot.getUser(user.id);
        if (!userconfig.rankBan) return interaction.reply({ content: `**${user?.username}** is not ranked banned.`, ephemeral: true });
        userconfig.moderate().rankUnban(interaction.user.id, reason);
        return bot.createEmbed(interaction)
            .setColor('Green')
            .setContent(`<@${user.id}>`)
            .setFooter({ text: `Punishment lifted by ${interaction.user.username}` }).setTimestamp()
            .setDescription(`**${user?.username}** has been **unbanned from ranked** for *${reason}*`).send();
    }
}