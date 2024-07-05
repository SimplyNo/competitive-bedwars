import { Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { Util } from "../../util/Util";

export default class GamehCommand extends Command {
    constructor() {
        super({
            name: 'game',
            description: 'View a specific game',
            aliases: ['match', 'vg', 'vm'],
            type: 'game'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig: userConfig }: CommandContext): Promise<void | Message<boolean>> {
        const id = parseInt(args[0]);
        if (!id) return bot.createErrorEmbed(message).setDescription(`You need to provide a game ID to look up.`).send();
        const game = bot.rankedManager.getGameByID(id);
        if (!game) return bot.createErrorEmbed(message).setDescription(`Game \`${id}\` could not be found.`).send();

        return bot.createEmbed(message)
            .setTitle(`Game #${game.id} Overview`)
            .setDescription(`
**Date**: ${Util.getDiscordTimeFormat(game.created, 'D')}
**Status**: ${game.voided ? 'Voided' : game.results ? 'Scored' : 'Unscored'}
**Winners**: ${game.results?.winner === 'team1' ? 'Team 1' : game.results?.winner === 'team2' ? 'Team 2' : 'N/A'}
**MVP(s)**: ${game.results?.mvps.map(p => `<@${p.id}>`).join(', ') || 'N/A'}
**Bed-Breaker(s)**: ${game.results?.bedBreaks.map(p => `<@${p.id}>`).join(', ') || 'N/A'}
`)
            .addFields([
                {
                    name: `${game.voided ? '<:yellow:1256186102352576652>' : game.results?.winner === 'team1' ? '<:green:1256186072531079179>' : '<:red:1256186121306771551>'} Team 1`,
                    value: `${game.game?.team1.map(p => `• <@${p.id}>`).join('\n')}`,
                    inline: true
                },
                {
                    name: `${game.voided ? '<:yellow:1256186102352576652>' : game.results?.winner === 'team2' ? '<:green:1256186072531079179>' : '<:red:1256186121306771551>'} Team 2`,
                    value: `${game.game?.team2.map(p => `• <@${p.id}>`).join('\n')}`,
                    inline: true
                }
            ])
            .send()
    }
}