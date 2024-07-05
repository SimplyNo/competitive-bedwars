import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { Util } from "../../util/Util";

export default class GamesCommand extends Command {
    constructor() {
        super({
            name: 'games',
            description: 'View all your CBW games.',
            aliases: ['matches'],
            type: 'game'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig: userConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!userConfig) return bot.createErrorEmbed(message).setDescription(`Only registered players can use this.`).send();
        const pageNumber = parseInt(args[args.length - 1]);
        if (pageNumber) args.pop();

        const member = (await bot.parseMember(args[0], bot.getMainGuild()!)) || message.member;
        if (!member) return bot.createErrorEmbed(message).setDescription(`Invalid member!`).send();
        const verified = bot.getVerifiedUser({ id: member.id });
        if (!verified) return bot.createErrorEmbed(message).setDescription(`${member} is not registered!`).send();
        const gameHistory = verified.rbw.gameHistory.sort((a, b) => b.id - a.id);
        if (!gameHistory.length) return bot.createEmbed(message)
            .setTitle(`${Util.capitalizeFirstLetter(verified.username || 'Player')}'s Recent Games`)
            .setDescription(`No Games found!`).send();
        const pages = Util.chunkArray(gameHistory, 8).map((games, index) => {
            return bot.createEmbed()
                .setTitle(`${Util.capitalizeFirstLetter(verified.username || 'Player')}'s Recent Games`)
                .setDescription(games.map(g => `${g.outcome === 'win' ? '<:green:1253993484159811605>' : g.outcome === 'loss' ? '<:red:1253993484755533926>' : '<:yellow:1253994443271573535> ~~'} Game #${g.id} (${Util.getDiscordTimeFormat(g.date || Date.now(), "D")})${g.outcome === 'void' ? '~~' : ''}`).join('\n') || 's')
                .setFooter({ text: `Page ${index + 1} of ${Math.ceil(gameHistory.length / 8)} • Competitive Bedwars`, iconURL: `https://i.imgur.com/itMN1e0.png` });
        });
        let currentPage = Math.min(pageNumber || 1, pages.length);
        const generatePage = () => {
            return pages[currentPage - 1];
        }
        const msg = await message.reply({
            embeds: [generatePage()],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId(`left`)
                            .setEmoji('<:left:1252492539718799450>')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`right`)
                            .setEmoji('<:right:1252492780551409725>')
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        })
        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            idle: 120000
        }).on('collect', (interaction) => {
            interaction.deferUpdate();
            if (interaction.customId === 'left') {
                currentPage--;
                if (currentPage < 1) currentPage = pages.length;
            }
            if (interaction.customId === 'right') {
                currentPage++;
                if (currentPage > pages.length) currentPage = 1;
            }
            msg.edit({
                embeds: [generatePage()]
            })
        })
            .on('end', () => {
                msg.edit({ components: [] });
            })
    }
}