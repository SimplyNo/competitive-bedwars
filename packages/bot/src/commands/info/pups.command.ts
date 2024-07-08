import { Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { ranks } from "../../../../../score_sheet.json";
export default class PupsCommand extends Command {
    constructor() {
        super({
            name: 'pups',
            description: 'View current PUPS.',
            type: 'info'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const allMembers = await message.guild.members.fetch().catch(e => null);
        if (!allMembers) return bot.createErrorEmbed(message).setDescription(`Failed to get pups.`).send();
        const pups = allMembers.filter(m => m.roles.cache.has(bot.config.roles.pups));
        bot.createEmbed(message)
            .setTitle(`PUPs List (${pups.size})`)
            .setDescription(pups.map(p => (`<@${p.id}>`)).join(' • ') || "There are no PUPs currently.")
            .send()
    }
}