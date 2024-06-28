import { Collection, Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { cpuUsage, } from "os-utils";
import { Util } from "../../util/Util";
const voided = new Collection<number, string>();
export default class ScoreCommand extends Command {
    constructor() {
        super({
            name: 'score',
            description: 'Score a game.',

        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig: userConfig }: CommandContext): Promise<void | Message<boolean>> {
        const game = bot.rankedManager.getGameByTextChannel(message.channel.id, true);
        if (!game) return bot.createErrorEmbed(message).setDescription(`You must be in a game channel to use this command.`).send();
        if (game.results) return bot.createErrorEmbed(message).setDescription(`This game has already been scored!`).send();
        const status = await bot.api.autoscore.get('status');
        if (!status) return bot.createErrorEmbed(message).setDescription(`Auto Score is currently offline, please take a screenshot of the game results and bed breaks to be scored manually.`).send();
        if (status.bots.find((bot: any) => bot?.activeGame?.game?.gameID === game.id)) return bot.createErrorEmbed(message).setDescription(`This game is already being scored!`).send();
        const replayID = args.join(' ').match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gm)?.[0];
        if (!replayID) return bot.createErrorEmbed(message).setDescription(`Failed to parse replay ID. Please provide a valid replay ID/command to be scored.`).send()
        const existingGame = bot.rankedManager.getGameByReplayID(replayID);
        if (existingGame) return bot.createErrorEmbed(message).setDescription(`A game has already been scored with the replay ID \`${replayID}\`.`).send();
        const queue = await bot.api.autoscore.send('processgame', {
            gameID: game.id,
            replayID,
            team1: game.getTeamPlayers('team1').map(p => ({ uuid: p.uuid!, username: p.getGameNickname() })),
            team2: game.getTeamPlayers('team2').map(p => ({ uuid: p.uuid!, username: p.getGameNickname() })),
        });
        if (!queue || queue.error) {
            return bot.createErrorEmbed(message).setDescription(`Failed to queue **Game ${game.id}** for autoscoring.\n**Error**: \`${queue?.error || 'Autoscore is currently offline.'}\`\n\n_The game has been logged and will be processed once autoscore is back._`).send()
        }
        game.update({ replayScoring: { replayID } });
        game.close({ moveToScoring: true });
        bot.createSuccessEmbed(message)
            .setTitle(`Scoring Game #${game.id}...`)
            .setDescription(`**Game #${game.id}** is now being scored. This channel will stay open until the game is scored.

• **Replay ID**: \`${replayID}\`
• **Autoscore Queue Number**: \`${queue?.queueNumber || 0}\`

Thanks for playing!`)
            .send()
    }
}