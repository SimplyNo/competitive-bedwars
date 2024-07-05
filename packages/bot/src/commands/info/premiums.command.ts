import { Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { ranks } from "../../../../../score_sheet.json";
export default class PremiumsCommand extends Command {
    constructor() {
        super({
            name: 'premiums',
            aliases: ['premium', 'prem', 'prems'],
            description: 'View current Premiums.',
            type: 'info'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const allMembers = await message.guild.members.fetch().catch(e => null);
        if (!allMembers) return bot.createErrorEmbed(message).setDescription(`Failed to get premiums.`).send();
        const premiums = allMembers.filter(m => m.roles.cache.has(bot.config.roles.premium));
        bot.createEmbed(message)
            .setTitle(`Premium List (${premiums.size})`)
            .setDescription(premiums.map(p => (`<@${p.id}>`)).join(' • ') || "No Premiums Currently")
            .send()
    }
}