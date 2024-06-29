import { CategoryChannel, InteractionResponse, Message, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Util } from "../../util/Util";

export default class NukePartyChannelsCommand extends SlashCommand {
    constructor() {
        super({
            name: "nukepartychannels",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("nukepartychannels")
                .setDescription("nuke party channels")
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const partyCategory = await interaction.guild.channels.fetch(bot.config.channels.partyCategory) as CategoryChannel;
        interaction.reply({ embeds: [bot.createSuccessEmbed().setDescription(`nuking channels...`)], ephemeral: true });
        partyCategory.children.cache.forEach(async channel => {
            if (channel.isVoiceBased()) {
                for (const [id, member] of channel.members) {
                    await member.voice.setChannel(interaction.guild.channels.cache.get('1247279352908087469') as VoiceChannel | null || null);
                }
            }
            channel.delete();
        })
    }
}