import { CategoryChannel, Message, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import { Wrappers } from "../../wrappers/Wrappers";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class CloseQueueCommand extends SlashCommand {
    constructor() {
        super({
            name: 'closequeue',
            slash: new SlashCommandBuilder()
                .setName('closequeue')
                .setDescription('Close the queue.'),
            type: 'admin',
            adminOnly: true,
            usage: '<user>'
        })
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        // if (!serverConf.isQueueOpen()) return bot.createErrorEmbed(interaction).setDescription(`The queue is already closed!`).send();
        serverConf.set({ queueStatus: 'closed' });
        const channel = await bot.parseChannel(bot.config.channels.queue, bot.getMainGuild()!);
        await channel?.setName(`Queue [CLOSED]`);
        const partyCategory = await interaction.guild.channels.fetch(bot.config.channels.partyCategory) as CategoryChannel;
        partyCategory.children.cache.forEach(async channel => {
            if (channel.isVoiceBased()) {
                for (const [id, member] of channel.members) {
                    await bot.api.workers.moveMember(member.id, bot.config.channels.waitingRoom);
                }
            }
            channel.delete();
        })
        return bot.createEmbed(interaction).setDescription(`The queue is now closed.`).send();
    }
}