import { CategoryChannel, InteractionResponse, Message, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Util } from "../../util/Util";

export default class TestEloCommand extends SlashCommand {
    constructor() {
        super({
            name: "testelo",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("testelo")
                .setDescription("test elo")
                .addNumberOption(option =>
                    option
                        .setName('min')
                        .setDescription('min elo')
                        .setRequired(true)
                )
                .addNumberOption(option =>
                    option
                        .setName('max')
                        .setDescription('max elo')
                        .setRequired(true)
                )
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        if (!bot.config.developers.includes(interaction.user.id)) return interaction.reply(`You do not have permission to use this command!`)
        const min = interaction.options.get('min')?.value as number;
        const max = interaction.options.get('max')?.value as number;
        const allVerified = bot.getAllVerifiedUsers();
        allVerified.forEach(verified => {
            verified.ranked().setElo(Util.getNumberBetween(min, max));
        })

        interaction.reply({ content: `${allVerified.length} users set random elo from \`${min}\` to \`${max}\``, ephemeral: false });

    }
}