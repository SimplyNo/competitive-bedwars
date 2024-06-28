import { CategoryChannel, InteractionResponse, Message, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Util } from "../../util/Util";
export default class NukeScoreChannelsCommand extends SlashCommand {
    constructor() {
        super({
            name: "nukescorechannels",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("nukescorechannels")
                .setDescription("nuke score channels")
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const scoreCategory = await interaction.guild.channels.fetch(bot.config.channels.scoringCategory) as CategoryChannel;
        interaction.reply({ embeds: [bot.createSuccessEmbed().setDescription(`nuking channels...`)], ephemeral: true });
        scoreCategory.children.cache.forEach(async channel => {
            if (channel.isVoiceBased()) {
                for (const [id, member] of channel.members) {
                    await bot.api.workers.moveMember(member.id, bot.config.channels.waitingRoom);
                    // await member.voice.setChannel(interaction.guild.channels.cache.get(bot.config.channels.waitingRoom) as VoiceChannel | null || null);
                }
            }
            bot.api.workers.deleteChannel(channel.id);
        })
    }
}