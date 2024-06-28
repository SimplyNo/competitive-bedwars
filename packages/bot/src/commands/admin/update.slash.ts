import { ChannelType, InteractionResponse, Message, SlashCommandBuilder, TextChannel, VoiceBasedChannel, VoiceChannel } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Util } from "../../util/Util";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
import { verifiedUsers } from "../../Bot";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";

export default class UpdateCommand extends SlashCommand {
    constructor() {
        super({
            name: "update",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("update")
                .setDescription("updates the picked users elo to whatever you put it as")
                .addUserOption(subcmd =>
                    subcmd
                        .setName("user")
                        .setDescription("The user to update")
                        .setRequired(true))
                .addIntegerOption(subcmd =>
                    subcmd
                        .setName("elo")
                        .setDescription("The elo to update the user to")
                        .setAutocomplete(true)
                        .setRequired(true))

        });
    }
    async autocomplete({ bot, interaction, serverConf, userConfig, verifiedConfig }: AutoCompleteContext): Promise<void> {
        const user = interaction.options.get("user")?.value as string || userConfig.id;
        let elo = (interaction.options.get("elo")?.value || 300) as number;
        if (isNaN(elo)) elo = 300;
        const userConf = bot.getUser(user);
        const verified = userConf.getVerified();
        if (!verified) return interaction.respond([{ name: "This user is not registered.", value: "0" }]);
        const ogElo = verified.rbw.elo;
        const { percent, rank } = verified.ranked().getRankFromElo(elo);
        interaction.respond([{ name: `Current Elo: ${ogElo} → New Elo: ${elo} (${rank} ${percent}%)`, value: `${elo}` }]);
    }
    async run({ bot, interaction, serverConf, verifiedConfig, userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const user = interaction.options.get("user", true).user!;
        const elo = interaction.options.get("elo", true).value as number;
        const verified = bot.getVerifiedUser({ id: user.id });
        if (!verified) return bot.createErrorEmbed(interaction).setDescription(`${user} is not registered!`).send();
        const oldElo = verified?.rbw.elo;
        verified.ranked().setElo(elo);
        bot.logger.log(bot.config.channels.statLogs, {
            embeds: [
                bot.createEmbed()
                    .setDescription(`<@${interaction.user.id}> (${verifiedConfig?.username}) updated <@${verified.id}> (${verified.username})'s ELO: \`${oldElo}\` -> \`${elo}\``)
                    .setFooter(null)
            ],

        })
        return interaction.reply({
            ephemeral: true,
            embeds: [
                bot.createSuccessEmbed(interaction)
                    .setDescription(`${user}'s ELO has been updated.\n\n\`${oldElo}\` -> \`${elo}\``)
            ]
        })
    }
}