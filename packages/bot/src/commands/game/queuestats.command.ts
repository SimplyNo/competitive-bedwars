import { Collection, Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { cpuUsage, } from "os-utils";
import { Util } from "../../util/Util";
const voided = new Collection<number, string>();
export default class QueueStatsCommand extends Command {
    constructor() {
        super({
            name: 'queuestats',
            aliases: ['qs', 'q'],
            description: 'See stats of players in the queue.',
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig: userConfig }: CommandContext): Promise<void | Message<boolean>> {
        const game = bot.rankedManager.getGameByTextChannel(message.channel.id);
        if (!game) return bot.createErrorEmbed(message).setDescription(`You must be in a game channel to use this command.`).send();


    }
}