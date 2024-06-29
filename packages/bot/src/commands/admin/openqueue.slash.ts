import { CategoryChannel, Message, SlashCommandBuilder, VoiceChannel } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import { Wrappers } from "../../wrappers/Wrappers";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class OpenQueueCommand extends SlashCommand {
    constructor() {
        super({
            name: 'openqueue',
            slash: new SlashCommandBuilder()
                .setName('openqueue')
                .setDescription('Open the queue.'),
            type: 'admin',
            adminOnly: true,
            usage: '<user>'
        })
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        // if (serverConf.isQueueOpen()) return bot.createErrorEmbed(interaction).setDescription(`The queue is already closed!`).send();
        serverConf.set({ queueStatus: 'open' });
        const channel = await bot.parseChannel(bot.config.channels.queue, bot.getMainGuild()!);
        await channel?.setName(`Queue (OPEN)`);
        return bot.createEmbed(interaction).setDescription(`The queue is now OPEN.`).send();
    }
}