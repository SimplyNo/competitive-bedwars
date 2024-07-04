import { Collection, Message } from "discord.js"
import { Command, CommandContext } from "../../types"
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
        const team1 = game.getTeamPlayers('team1');
        const team2 = game.getTeamPlayers('team2');
        bot.createEmbed(message)
            .setAuthor({ name: `Game #${game.id} Player Stats` })
            .setDescription(game.players.map(p => `• <@${p.id}> | ${p.ranked().getStat('wlr')} WL, ${p.ranked().getStat('mvp_percent')}% MVP, ${p.ranked().getStat('beds_percent')}% BED, ${p.ranked().getStat('streak')} WS`).join('\n') || 'No players found.')
            .send()

    }
}