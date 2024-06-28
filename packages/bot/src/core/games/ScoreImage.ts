import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from "canvas";
import { teamPlayer } from "./RankedGame";
import { Util } from "../../util/Util";
registerFont('../../assets/fonts/Poppins-Light.ttf', { family: 'Poppins' });
registerFont('../../assets/fonts/Poppins-SemiBold.ttf', { family: 'PoppinsSemiBold' });
registerFont('../../assets/fonts/Poppins-ExtraLight.ttf', { family: 'PoppinsLight' });
registerFont('../../assets/fonts/Poppins-Medium.ttf', { family: 'Poppins', weight: 'bold' });
registerFont('../../assets/fonts/ADAM.CG PRO.otf', { family: 'ADAMCGPRO', });
registerFont('../../assets/fonts/Poppins-Regular.ttf', { family: 'PoppinsRegular' });
const images = {
    bg: await loadImage('../../assets/scoring/scored.png'),
    bed: await loadImage('../../assets/scoring/bed.png'),
    mvp: await loadImage('../../assets/scoring/mvp.png'),
    ranks: {
        bronze: await loadImage('../../assets/ranks/bronze.png'),
        silver: await loadImage('../../assets/ranks/silver.png'),
        gold: await loadImage('../../assets/ranks/gold.png'),
        platinum: await loadImage('../../assets/ranks/platinum.png'),
    }
}
export type ScoreCardPlayer = {
    team: 'team1' | 'team2';
    oldElo: number;
    newElo: number;
    mvp: boolean;
    bed: boolean;
    username: string;
};

export default class ScoreImage {
    static async generateScoreImage(gameID: number, winningTeam: 'team1' | 'team2', players: ScoreCardPlayer[]) {
        const winners = players.filter(p => p.team == winningTeam);
        const losers = players.filter(p => p.team != winningTeam);
        const bg = images.bg;
        const canvas = createCanvas(bg.width, bg.height), { width, height } = canvas, ctx = canvas.getContext('2d');
        ctx.drawImage(bg, 0, 0, width, height);
        ctx.fillStyle = "#757474";
        ctx.font = "54px PoppinsLight";
        ctx.fillText(`GAME #${gameID}`, 120, 85);
        this.drawCard(ctx, 185, 179.5, winners);
        this.drawCard(ctx, 185, 608.5, losers);

        return canvas.toBuffer();
    }
    private static drawCard(ctx: CanvasRenderingContext2D, posX: number, posY: number, team: ScoreCardPlayer[]) {
        this.drawLineSection1(ctx, posX - 1, posY + 2, team[0].team, team[0].username, team[0].oldElo, team[0].newElo, team[0].bed, team[0].mvp);
        this.drawLineSection2(ctx, posX - 1, posY + 2, team[0].team, team[0].username, team[0].oldElo, team[0].newElo, team[0].bed, team[0].mvp);

        team[1] && this.drawLineSection1(ctx, posX - 1, posY + 99, team[1].team, team[1].username, team[1].oldElo, team[1].newElo, team[1].bed, team[1].mvp);
        team[1] && this.drawLineSection2(ctx, posX - 1, posY + 94, team[1].team, team[1].username, team[1].oldElo, team[1].newElo, team[1].bed, team[1].mvp);

        team[2] && this.drawLineSection1(ctx, posX - 1, posY + 197, team[2].team, team[2].username, team[2].oldElo, team[2].newElo, team[2].bed, team[2].mvp);
        team[2] && this.drawLineSection2(ctx, posX - 1, posY + 192, team[2].team, team[2].username, team[2].oldElo, team[2].newElo, team[2].bed, team[2].mvp);

        team[3] && this.drawLineSection1(ctx, posX - 1, posY + 294, team[3].team, team[3].username, team[3].oldElo, team[3].newElo, team[3].bed, team[3].mvp);
        team[3] && this.drawLineSection2(ctx, posX - 1, posY + 284, team[3].team, team[3].username, team[3].oldElo, team[3].newElo, team[3].bed, team[3].mvp);
    }

    private static drawLineSection1(ctx: CanvasRenderingContext2D, posX: number, posY: number, team: 'team1' | 'team2', username: string, oldElo: number, newElo: number, bed: boolean, mvp: boolean) {

        this.drawRank(ctx, posX + 1, posY - 2, newElo, 0.3675);

        this.drawString(ctx, posX + 58.5, posY + 3, username, 40, 600, false, undefined);

        let badgeX = 870;
        if (bed) {
            ctx.drawImage(images.bed, posX + badgeX, posY - 30.5);
            badgeX -= images.bed.width + 10;
        }
        if (mvp) {
            ctx.drawImage(images.mvp, posX + badgeX, posY - 30.5);
        }
    }
    private static drawLineSection2(ctx: CanvasRenderingContext2D, posX, posY, team: 'team1' | 'team2', username: string, oldElo: number, newElo: number, bed: boolean, mvp: boolean) {
        this.drawString(ctx, posX + 1132, posY + 4, Util.plusify(newElo - oldElo), 41, 300, true, undefined, 'PoppinsSemiBold');
        this.drawString(ctx, posX + 1291, posY + 4, oldElo, 41, 150, true, "#757474", 'PoppinsRegular');
        this.drawString(ctx, posX + 1509, posY + 4, newElo, 41, 150, true, undefined, 'PoppinsRegular');
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
    private static drawString(ctx: CanvasRenderingContext2D, posX: number, posY: number, str: string | number, size: number, widthMax: number, center: boolean = false, color = '#ffffff', font?: string) {
        let currentSize = size;
        ctx.fillStyle = color;
        ctx.textBaseline = 'middle';
        ctx.textAlign = center ? "center" : "left";
        let text = str.toString().toUpperCase();
        const isNumber = parseInt(text);
        const fontFamily = font ? font : !isNaN(isNumber) ? 'Poppins' : 'ADAMCGPRO';
        if (isNumber) text = str.toLocaleString();

        ctx.font = `${currentSize}px ${fontFamily}`;
        while (ctx.measureText(text).width > widthMax) {
            currentSize -= 2;
            ctx.font = `${currentSize}px ${fontFamily}`;
        }
        console.log('width:', ctx.measureText(text).width, widthMax)
        console.log(`draw string:`, text, currentSize);

        ctx.fillText(text, posX, posY);
        // ctx.fillStyle = 'red';
        // ctx.fillRect(posX, posY, 2, 2);
    }
}