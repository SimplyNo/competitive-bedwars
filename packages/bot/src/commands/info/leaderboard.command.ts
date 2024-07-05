import { Canvas, createCanvas, Image, loadImage, registerFont, CanvasRenderingContext2D } from 'canvas';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import { text } from 'express';
import { RawVerifiedConfig, VerifiedConfig } from '../../types/config/VerifiedConfig';
import { Bot } from '../../Bot';
import { Wrappers } from '../../wrappers/Wrappers';
import Embed from '../../util/Embed';
import { validStats } from '../../core/games/RankedGameManager';
registerFont('../../assets/fonts/Poppins-Light.ttf', { family: 'Poppins' });
registerFont('../../assets/fonts/Poppins-ExtraLight.ttf', { family: 'PoppinsLight' });
registerFont('../../assets/fonts/Poppins-Medium.ttf', { family: 'Poppins', weight: 'bold' });
registerFont('../../assets/fonts/ADAM.CG PRO.otf', { family: 'ADAMCGPRO' });
type lbSearchUser = { username: string, stat: number, elo: number }
const images = {
    bg: await loadImage('../../assets/leaderboard/leaderboard.png'),
    num2: await loadImage('../../assets/leaderboard/2.png'),
    num3: await loadImage('../../assets/leaderboard/3.png'),
    topBubble: await loadImage('../../assets/leaderboard/bubble.png'),
    steve: await loadImage('../../assets/steve.png'),
    ranks: {
        bronze: await loadImage('../../assets/ranks/bronze.png'),
        silver: await loadImage('../../assets/ranks/silver.png'),
        gold: await loadImage('../../assets/ranks/gold.png'),
        platinum: await loadImage('../../assets/ranks/platinum.png'),
    }
}
const normalizedNames: Partial<Record<validStats, string[]>> = {
    wins: ['Wins', 'Win'],
    mvps: ['MVPS', 'MVP'],
    streak: ['Win Streak', 'Win Streak'],
    wlr: ["Win/Loss Ratio", "WLR"],
    games: ["Games Played", "Games Played"],
    bedsBroken: ['Beds Broken', 'Beds'],
    elo: ["Rating", "Rating"],
    commends: ["Commends", "Commends"]
}
export default class LeaderboardCommand extends Command {
    constructor() {
        super({
            name: 'leaderboard',
            aliases: ['lb'],
            description: 'See the ranked leaderboard',
            cooldown: 5,
            usage: '<player/position?>',
            type: 'stats'
        })
    }
    public static calculateImagePage(position: number): number {
        return Math.floor((position) / 20);
    }
    public static calculateImagePosition(page: number): number {
        if (page < 1) return 0;
        return page * 20;
    }
    public static calculatePage(position: number): number {
        return Math.floor((position) / 15);
    }
    public static calculatePosition(page: number): number {
        if (page < 1) return 0;
        return page * 15;
    }
    async run({ bot, args, message, flags, prefix, serverConf, verifiedConfig: userConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!userConfig) return bot.createErrorEmbed(message).setDescription(`Only registered players can use this.`).send();

        const pageNumber = parseInt(args[args.length - 1]);
        if (pageNumber) args.pop();
        const member = (await bot.parseMember(args[args.length - 1], bot.getMainGuild()!));
        const verified = member ? bot.getVerifiedUser({ id: member.id }) : null;
        let type = <keyof typeof normalizedNames>(args[0] || 'elo');
        if (['mvp', 'mvps'].includes(type.toLowerCase())) type = 'mvps';
        else if (['win', 'wins'].includes(type.toLowerCase())) type = 'wins';
        // else if (['loss', 'losses'].includes(type.toLowerCase())) type = 'losses';
        else if (['streak', 'streaks', 'winstreak', 'ws'].includes(type.toLowerCase())) type = 'streak';
        else if (['wlr'].includes(type.toLowerCase())) type = 'wlr';
        else if (['bedbroken', 'bedsbroken', 'beds', 'bed'].includes(type.toLowerCase())) type = 'bedsBroken';
        else if (['elo', 'rating'].includes(type.toLowerCase())) type = 'elo';
        else if (['commends', 'commend'].includes(type.toLowerCase())) type = 'commends';
        else if (['games'].includes(type.toLowerCase())) type = 'games';
        else if (!member || member && args.length > 1) return bot.createErrorEmbed(message).setDescription(`Valid leaderboard stats: ${['beds', 'winstreak', 'mvps', 'wins', 'elo', 'games', 'commends'].map(e => `\`${e}\``).join(', ')}`).send()

        else type = 'elo';

        const leaderboard = bot.rankedManager.getLeaderboard(type)

        // let position = verified ? verified.ranked().getPosition(type) : type === 'elo' && !flags['text'] ? LeaderboardCommand.calculatePositionElo((pageNumber - 1) || 0) : LeaderboardCommand.calculatePosition((pageNumber - 1) || 0);
        let position = verified ? verified.ranked().getPosition(type) : !flags['text'] ? LeaderboardCommand.calculateImagePosition((pageNumber - 1) || 0) : LeaderboardCommand.calculatePosition((pageNumber - 1) || 0);
        if (!leaderboard[position]) position = leaderboard.length - 1;
        const msg = await message.reply(
            {
                ...(await generateLeaderboardOptions(position)),
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
            });
        msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, idle: 60000 })
            .on('collect', async (btn) => {
                const posDiff = type === 'elo' && !flags['text'] ? 20 : 15;
                btn.deferUpdate();
                if (btn.customId === 'left') {
                    position = position - posDiff;
                    if (position < 0) position = 0;
                } else {
                    position = position + posDiff;
                    if (position >= leaderboard.length) position = leaderboard.length - 1;
                }
                msg.edit(await generateLeaderboardOptions(position));
            })
            .on('end', () => {
                msg.edit({ components: [] }).catch(e => null);
            })


        async function generateLeaderboardOptions(position: number) {
            return !flags['text'] ? {
                files: [{
                    attachment: await LeaderboardCommand.generateImageLeaderboard(leaderboard.map(e => ({ username: e.username!, stat: e.rbw[type] || 0, elo: e.rbw.elo })), position, type)
                }],
            } : {
                embeds: [await LeaderboardCommand.generateLeaderboard(type, leaderboard.map(e => ({ username: e.username!, stat: e.rbw[type] || 0, elo: e.rbw.elo })), position)]
            }
        }
    }
    static async generateLeaderboard(leaderboardName: string, leaderboard: lbSearchUser[], searchPosition = 0) {
        const page = this.calculatePage(searchPosition);
        const playersToShow = leaderboard.slice(page * 15, page * 15 + 15);
        return new Embed()
            .setTitle(`${normalizedNames[leaderboardName][1]} Leaderboard`)
            .setDescription(playersToShow.map((player, i) => {
                const pos = leaderboard.indexOf(player) + 1;
                return `#${pos} **${player.username}**: \`${player.stat.toLocaleString()}\``
            }).join('\n'))
            .setFooter({ text: `Page ${page + 1} of ${Math.ceil(leaderboard.length / 15)} • Competitive Bedwars`, iconURL: `https://i.imgur.com/itMN1e0.png` });
    }
    static async generateImageLeaderboard(leaderboard: lbSearchUser[], searchPosition = 0, stat: validStats) {
        console.log(`searchPosition:`, searchPosition)
        // const searchPosition = (searchPlayer?.ranked().getPosition() || 1) - 1;
        const page = this.calculateImagePage(searchPosition);
        console.log(`page:`, page)
        const bg = images.bg;
        const canvas = new Canvas(bg.width, bg.height), { width, height } = canvas, ctx = canvas.getContext("2d");
        ctx.drawImage(bg, 0, 0, width, height);
        ctx.fillStyle = "#757474";
        // ctx.fillStyle = "#ffffff";
        ctx.font = "54px PoppinsLight";
        // ctx.fillText('LEADERBOARD', 50, 100);
        ctx.fillText(`${normalizedNames[stat]![0].toUpperCase()}`, 117, 85);
        this.drawLbPage(ctx, leaderboard, page);

        return canvas.toBuffer('image/png');
    }
    private static drawLbPage(ctx: CanvasRenderingContext2D, leaderboard: lbSearchUser[], page = 0) {
        const dispPosition = this.calculateImagePosition(page);

        for (let i = 0; i < 20; i++) {
            const yMult = i % 10;
            const player = leaderboard[i + dispPosition];
            const pos = leaderboard.indexOf(player);
            const initialX = 175;
            const initialY = 168;
            if (player) this.drawLbBubble(ctx, i < 10 ? initialX : initialX + 864, initialY + 83.75 * yMult, player, pos + 1)
            ctx.fillStyle = '#ffffff'

        }
    }
    private static drawLbBubble(ctx: CanvasRenderingContext2D, posX: number, posY: number, player: lbSearchUser, position: number) {
        // ctx.fillStyle = "red";
        // ctx.fillRect(posX, posY, 10, 10);
        // this.drawString(ctx, posX - 1, posY, `#${position}`, 40, 100, true);
        const color = position === 1 ? '#72f0ff' : position === 2 ? '#ffdf0b' : position === 3 ? '#ca8327' : undefined;
        this.drawString(ctx, posX + 2, posY, `#${position}`, 37, 85, true, color || "#a5a5a5");
        this.drawString(ctx, posX + 150, posY, `${player.username}`, 37, 400, false, color);
        this.drawRank(ctx, posX + 97, posY - 6, player.elo, 0.3675);
        this.drawString(ctx, posX + 657, posY - 5, player.stat, 40, 120, true, color)
    }
    private static drawRank(ctx: CanvasRenderingContext2D, posX: number, posY: number, elo: number, scale: number) {
        const { rank } = Util.getRankFromElo(elo);
        console.log(`rank: ${rank} elo: ${elo}`)
        const img = images.ranks[rank] || null;
        if (img) {
            const width = img.width * scale;
            const height = img.height * scale;
            const centerX = posX - (width / 2);
            const centerY = posY - (height / 2);
            ctx.drawImage(img, centerX, centerY, width, height);
            // ctx.fillRect(centerX, centerY, 10, 10);
            // ctx.strokeRect(centerX, centerY, width, height);
            // ctx.fillRect(posX, posY, 2, 2);
        }
    }
    private static drawString(ctx: CanvasRenderingContext2D, posX: number, posY: number, str: string | number, size: number, widthMax: number, center: boolean = false, color = '#ffffff') {
        let currentSize = size;
        ctx.fillStyle = color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = center ? "center" : "left";
        let text = str.toString().toUpperCase();
        const isNumber = parseInt(text);
        const fontFamily = !isNaN(isNumber) ? 'Poppins' : 'ADAMCGPRO';
        if (isNumber) text = isNumber.toLocaleString();

        ctx.font = `${!isNaN(isNumber) ? 'bold' : 'normal'} ${currentSize}px ${fontFamily}`;
        while (ctx.measureText(text).width > widthMax) {
            currentSize -= 2;
            ctx.font = `${!isNaN(isNumber) ? 'bold' : 'normal'} ${currentSize}px ${fontFamily}`;
        }
        console.log('width:', ctx.measureText(text).width, widthMax)
        console.log(`draw string:`, text, currentSize);

        ctx.fillText(text, posX, posY);
        // ctx.fillStyle = 'red';
        // ctx.fillRect(posX, posY, 2, 2);
    }
}

