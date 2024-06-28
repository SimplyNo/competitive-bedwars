import { ScoreBots, gamesQueue } from "..";
import { BotToAutoScorerData, MinecraftAPIRoute } from "../AutoscoreAPI";

export default {
    type: 'get',
    path: '/status',
    async execute(req, res) {
        const queue = gamesQueue.map(g => g);
        const bots = ScoreBots.map(bot => ({ username: bot.bot.username, activeGame: bot.activeGame ? { game: bot.activeGame, totalTime: bot.replayTotalTime, currentTime: bot.replayCurrentTime } : null, locraw: bot.lastLocraw, online: bot.isRunning, uptime: bot.getUptime() }));
        res.send({ queue, bots });
    },
} as MinecraftAPIRoute