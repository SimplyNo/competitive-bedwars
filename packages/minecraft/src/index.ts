import { createBot } from "mineflayer";
import { Redis } from "ioredis";
import accounts from "../../../accounts.json";
import { ReplayWatcher } from "./ReplayWatcher";
import { AutoScorerAPI, BotToAutoScorerData } from "./AutoscoreAPI";
import { Collection } from "discord.js";
const redis = new Redis();
console.log(`Starting Competitive Bedwars Auto Scorer`)

export const AutoScoreAPI = new AutoScorerAPI();
AutoScoreAPI.listen();
export const gamesQueue = new Collection<string, BotToAutoScorerData['processgame']>();
export const ScoreBots = accounts.map(account => new ReplayWatcher(account.email, account.channelID));

setInterval(() => {
    const nextGame = gamesQueue.first();
    if (!nextGame) return
    const botWorker = ScoreBots.find(bot => bot.bot.world && !bot.activeGame);
    if (!botWorker) return;
    const { replayID, gameID, team1, team2, force } = nextGame;
    gamesQueue.delete(gameID.toString());
    botWorker.processReplay({ replayID, team1, team2, gameID, force });
}, 1000)
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
})