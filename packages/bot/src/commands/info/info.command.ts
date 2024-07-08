import { Canvas, CanvasRenderingContext2D, Image, loadImage, registerFont } from 'canvas';
import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import { text } from 'express';
registerFont('../../assets/fonts/Poppins-Light.ttf', { family: 'Poppins' });
registerFont('../../assets/fonts/Poppins-Medium.ttf', { family: 'Poppins', weight: 'bold' });
registerFont('../../assets/fonts/ADAM.CG PRO.otf', { family: 'ADAMCGPRO' });
async function drawTextWithEmojis(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, emoji: { image: Image, scale: number }, fontSize: number, fontStartingSize: number) {
    const fontSizeScale = fontSize / fontStartingSize;
    const textParts = text.split('$');
    let currentX = x - (ctx.measureText(text).width / 2);
    console.log(textParts);
    textParts.forEach((part, index) => {
        // Draw text part
        ctx.fillText(part, currentX, y);
        currentX += ctx.measureText(part).width;

        // Draw emoji if it's not the last part
        if (index < textParts.length - 1) {
            console.log(`draw emoji`, emoji.scale)
            const emojiWidth = emoji.image.width * (emoji.scale * fontSizeScale);
            const emojiHeight = emoji.image.height * (emoji.scale * fontSizeScale);
            const centerX = (fontSizeScale * 15) + (currentX) - emojiWidth / 2;
            const centerY = y - emojiHeight / 2;

            ctx.drawImage(emoji.image, centerX, centerY, emojiWidth, emojiHeight); // Adjust emoji size as needed
            currentX += (fontSizeScale * 16) + emojiWidth; // Adjust based on emoji size

        }
    });
}

export default class InfoCommand extends Command {
    constructor() {
        super({
            name: 'info',
            aliases: ['i', 'stats'],
            description: 'See a player\'s ranked stats',
            cooldown: 5,
            type: 'stats'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig: userConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!userConfig) return bot.createErrorEmbed(message).setDescription(`Only registered players can use this.`).send();
        const member = (await bot.parseMember(args[0], bot.getMainGuild()!)) || message.member;
        if (!member) return bot.createErrorEmbed(message).setDescription(`Invalid member!`).send();
        const verified = bot.getVerifiedUser({ id: member.id });
        if (!verified) return bot.createErrorEmbed(message).setDescription(`${member} is not registered!`).send();
        const { rbw } = verified;
        const { percent, rank } = verified.ranked().getRankFromElo();
        console.log(`percent,rank:`, percent, rank)
        return message.reply(await InfoCommand.generateInfoCard({
            name: verified.username!,
            elite: false,
            wins: rbw.wins,
            wlr: verified.ranked().getStat('wlr'),
            mvpRate: (Math.floor(rbw.mvps / (rbw.wins + rbw.losses) * 100)) || 0,
            mvps: rbw.mvps,
            pos: verified.ranked().getPosition(),
            totalPos: 1000,
            rating: rbw.elo,
            progress: percent,
            rank,
            winsTillNextPos: verified.ranked().getWinsTillNextPosition()
        }));
        // return message.reply(await InfoCommand.generateInfoCard({
        //     name: username!,
        //     wins: 78,
        //     wlr: 0.7,
        //     mvpRate: 6,
        //     mvps: 12,
        //     pos: 150,
        //     totalPos: 5293,
        //     streak: 2,
        //     progress: percent,
        //     rank
        // }));
    }
    public static async generateInfoCard(options: { name: string, elite: boolean, wins: number, wlr: number, pos: number, totalPos: number, mvps: number, mvpRate: number, rating: number, progress: number, rank: string, winsTillNextPos: number }) {
        console.time('gen');
        const { mvpRate, mvps, elite, name, pos, progress, rank, rating: rating, totalPos, wins, wlr, winsTillNextPos } = options;
        const img = await loadImage(`../../assets/info_cards/${elite ? 'elite' : 'normal'}/${rank}.png`);

        const canvas = new Canvas(img.width, img.height), { width, height } = canvas, ctx = canvas.getContext("2d");
        // load image
        ctx.drawImage(img, 0, 0, width, height);
        if (rank !== 'platinum') await this.drawProgressBar(ctx, progress, 500, 1048, 849);
        // Wins
        await this.generateSection(ctx, 798, 337, `${wins}`, `${wlr == Infinity ? 0 : wlr} W/L`);
        // Position
        await this.generateSection(ctx, 1207, 337, `#${pos}`, `{uparrow,0.35}IN ${winsTillNextPos.toLocaleString()} WINS`);
        // MVP
        await this.generateSection(ctx, 1620, 337, `${mvps}`, `${mvpRate}% RATE`);
        // Rating
        await this.generateSection(ctx, 799, 818, `${rating}`, "");

        this.renderName(ctx, name);
        // render skin from url
        const skinURL = `https://starlightskins.lunareclipse.studio/render/ultimate/${name}/full`;
        console.log(`Loading skin:`, skinURL);
        let skin = <Image | undefined>await Promise.race([loadImage(skinURL).catch(e => console.error(`error loading skin:`, e)), Util.wait(5000)]);
        if (!skin) skin = await loadImage('../../assets/steve.png');
        console.log(`Loaded skin.`)
        if (skin) {
            const posX = 340;
            const posY = 480;
            console.log(`skinWidth`, skin.width, `skinHeight`, skin.height)
            const skinWidth = skin.width * 0.9;
            const skinHeight = skin.height * 0.9;
            const centerX = posX - skinWidth / 2;
            const centerY = posY - skinHeight / 2;
            // draw skin centered at posX,posY:
            ctx.drawImage(skin, centerX, centerY, skinWidth, skinHeight);
            // ctx.fillStyle = 'red';
            // ctx.fillRect(posX, posY, 10, 10)
        }
        const attachment = canvas.toBuffer();
        console.timeEnd('gen');
        return ({
            files: [{
                attachment,
                name: `info_${name}.png`
            }]
        });
    }
    public static async drawProgressBar(ctx: CanvasRenderingContext2D, progress: number, maxWidth: number, x: number, y: number) {
        const progressBar = await loadImage('../../assets/progress/progress.png');
        const progressY = y;
        const progressXStart = x;
        const progressWidth = (progressBar.width * progress) / 100;
        const scale = 0.225;

        const cutBegin = progressBar.width / 2;
        // draw white straight line through cut
        ctx.fillStyle = "white";
        ctx.globalAlpha = 0.5;
        const widthToRemove = progressBar.width - progressWidth;
        const firstCut = progressXStart + cutBegin - widthToRemove / 2;
        const secondCut = firstCut + widthToRemove;

        // ctx.fillRect(progressXStart + cutBegin - widthToRemove / 2, progressY - 50, widthToRemove, progressBar.height);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(30, 255, 0, 0.25)';
        const sWidth = (progressXStart + progressBar.width) - secondCut;
        const sX = (secondCut - progressXStart);
        console.log(`progress:`, progress, `barwidth:`, progressBar.width, '2ndcut:', secondCut, 'swidth:', sWidth, 'sX:', sX)
        ctx.drawImage(progressBar, 0, 0, firstCut - progressXStart, progressBar.height, progressXStart, progressY, firstCut - progressXStart, progressBar.height);
        ctx.drawImage(progressBar,
            sX, // sx
            0, // sy
            sWidth, // sWidth
            progressBar.height, // sHeight
            firstCut - 1, // dx
            progressY, // dy
            sWidth, // dWidth
            progressBar.height // dHeight
        );
        ctx.shadowBlur = 0;



        // white text
        ctx.fillStyle = "white";
        ctx.font = `bold ${scale * 272.5}px Poppins`;
        ctx.fillText(`${progress}%`, progressXStart + 31, progressY + 65);


    }
    public static async generateSection(ctx: CanvasRenderingContext2D, x: number, y: number, main: string, sub: string) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `150px ADAMCGPRO`;
        if (ctx.measureText(main).width > 325) {
            ctx.font = `${150 - (6 * Math.floor(ctx.measureText(main).width / 50))}px ADAMCGPRO`;
        }
        ctx.fillText(main, x, y);
        ctx.textAlign = "left";
        let startingSize = 59;
        let currentSize = startingSize;
        ctx.fillStyle = "#c2c2c2";
        ctx.font = `${currentSize}px Poppins`;
        const symbols = sub.match(/\{([^}]+)\}/g) || [];
        const symbolImages: { image: Image, scale: number }[] = [];

        for (let _ of symbols) {
            const [symbol, scale] = _.slice(1, -1).split(',')
            // Extract symbol name without brackets for image source
            sub = sub.replace(_, '$');
            const img = await loadImage(`../../assets/symbol/${symbol}.png`);
            symbolImages.push({ image: img, scale: parseFloat(scale) });
        }
        // symbolImages.forEach((img, i) => ctx.drawImage(img.image, 100 * i, 0, img.image.width * img.scale, img.image.height * img.scale))
        let w = () => ctx.measureText(sub.toUpperCase()).width + symbolImages.reduce((prev, curr) => prev + 35 + curr.image.width * (curr.scale * (currentSize / startingSize)), 0);
        while (w() > 325) {
            ctx.font = `${currentSize}px Poppins`;
            currentSize -= 2;
        }
        await drawTextWithEmojis(ctx, sub.toUpperCase(), x, y + 156, symbolImages[0]!, currentSize, startingSize)



        // let currentX = x - (w() / 2);
        // for (let char of sub) {
        //     currentX += ctx.measureText(char).width;
        //     ctx.fillText(char, currentX, y + 156);
        //     // if (char === '$') {
        //     //     let img = symbolImages.shift();
        //     //     if (img) ctx.drawImage(img.image, x - (w() / 2) + textWidth, y + 156, (img.scale * (currentSize / startingSize)), (img.scale * (currentSize / startingSize)));
        //     // } else {
        //     // }
        //     console.log(char, ctx.measureText(char).width)
        // }
    }

    private static drawTextInBox(ctx: CanvasRenderingContext2D, txt: string, font: string, x: number, y: number, w: number, h: number) {
        const fontHeight = 20;
        const hMargin = 4;
        ctx.font = 'bold ' + fontHeight + 'px ' + font;
        ctx.textAlign = 'center';
        const txtWidth = ctx.measureText(txt).width + 2 * hMargin;
        ctx.save();
        ctx.translate(x + w / 2, y);
        ctx.strokeRect(-w / 2, 0, w, h);
        ctx.scale(w / txtWidth, h / fontHeight);
        ctx.translate(hMargin, 0)
        ctx.fillText(txt, -txtWidth / 2, 0);
        ctx.restore();
    }
    private static renderName(ctx: CanvasRenderingContext2D, name: string) {
        const textWidth = ctx.measureText(name.toUpperCase()).width;

        ctx.textAlign = "center";
        ctx.font = "68px ADAMCGPRO";
        console.log(`textWidth initial:`, textWidth);
        // this.drawTextInBox(ctx, name.toUpperCase(), 'Poppins', 380, 855, 150, 100);

        let w = ctx.measureText(name.toUpperCase()).width;
        let currentSize = 68;
        while (w > 300) {
            ctx.font = `${currentSize}px ADAMCGPRO`;
            w = ctx.measureText(name.toUpperCase()).width;
            currentSize -= 2;
        }
        // const x = 0; // Starting x position of the text
        // const y = 0; // Starting y position of the text
        // const gradient = ctx.createLinearGradient(402 - (w / 2), 894, (402 - w / 2) + w, 894);
        // // Add color stops to the gradient
        // gradient.addColorStop(0, 'red');
        // gradient.addColorStop(0.17, 'orange');
        // gradient.addColorStop(0.33, 'yellow');
        // gradient.addColorStop(0.5, 'green');
        // gradient.addColorStop(0.67, 'blue');
        // gradient.addColorStop(0.83, 'indigo');
        // gradient.addColorStop(1, 'violet');

        // // Apply the gradient to the text
        // ctx.fillStyle = gradient;
        ctx.fillStyle = "white";

        console.log(`textWidth final:`, w);
        console.log('finished font:', ctx.font);

        ctx.fillText(name.toUpperCase(), 402, 894);
    }
}