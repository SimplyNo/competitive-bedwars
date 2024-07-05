import { Collection, Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { cpuUsage, } from "os-utils";
import { Util } from "../../util/Util";
const voided = new Collection<number, string>();
export default class VoidCommand extends Command {
    constructor() {
        super({
            name: 'void',
            aliases: ['v'],
            description: 'Start a vote to void the game.',
            type: 'game'

        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig: userConfig }: CommandContext): Promise<void | Message<boolean>> {
        const game = bot.rankedManager.getGameByTextChannel(message.channel.id);
        if (!game) return bot.createErrorEmbed(message).setDescription(`You must be in a game channel to use this command.`).send();
        if (voided.has(game.id)) return bot.createErrorEmbed(message).setDescription(`A void vote has already been called.`).send();
        const voidVote = await bot.createEmbed(message).setContent(`${game.players.map(p => `<@${p.id}>`)}`).setTitle(`Game Void Vote`).setDescription(`A void vote has been called. If \`5\` votes are reached within \`60\` seconds, the game will be voided.\n\nReact with ✅ to vote.`).send();
        await voidVote.react('✅');
        const collector = voidVote.createReactionCollector({
            time: 60 * 1000
        })
        collector.on('end', (_, reason) => {
            if (reason === 'time') {
                return voidVote.reply({
                    embeds: [
                        bot.createEmbed().setTitle(`Void Vote Failed!`).setDescription(`Not enough votes were received to void the game. The gane will continue.`)
                    ]
                })
            }
        })
        collector.on('collect', async (reaction, user) => {
            console.log(reaction.emoji.toString(), reaction.count)
            if (reaction.emoji.toString() === '✅' && reaction.count >= 6) {
                // end game
                await voidVote.reply({
                    embeds: [
                        bot.createEmbed().setTitle(`Game Voided`).setDescription(`5 votes were recieved, and the game will be voided shortly.`)
                    ]
                })
                await Util.wait(1000);
                game.void(`Void vote passed.`)
                collector.stop();
            }
        })
    }
}