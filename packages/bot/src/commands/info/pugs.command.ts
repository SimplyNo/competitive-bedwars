import { Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { ranks } from "../../../../../score_sheet.json";
export default class PugsCommand extends Command {
    constructor() {
        super({
            name: 'pugs',
            description: 'View current PUGS.'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const allMembers = await message.guild.members.fetch().catch(e => null);
        if (!allMembers) return bot.createErrorEmbed(message).setDescription(`Failed to get pugs.`).send();
        const pugs = allMembers.filter(m => m.roles.cache.has(bot.config.roles.pugs));
        bot.createEmbed(message)
            .setTitle(`PUGS List (${pugs.size})`)
            .setDescription(pugs.map(p => (`<@${p.id}>`)).join(' • '))
            .send()
    }
}