import { Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { ranks } from "../../../../../score_sheet.json";
export default class RanksCommand extends Command {
    constructor() {
        super({
            name: 'ranks',
            description: 'View the bedwars ranks.'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        bot.createEmbed(message)
            .setTitle(`Competitive Bedwars | Ranks`)
            .setDescription(`${ranks.map(({ role, bed_break, lose, max, min, mvp, name, win }) =>
                `<@&${role}>\nWin (+${win}) | Loss (-${lose}) | MVP (+${mvp}) | Bed Break (+${bed_break})`).join('\n\n')}`)
            .send()
    }
}