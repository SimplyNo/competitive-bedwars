import { ScoreBots, gamesQueue } from "..";
import { BotToAutoScorerData, MinecraftAPIRoute } from "../AutoscoreAPI";

export default {
    type: 'post',
    path: '/processgame',
    async execute(req, res) {
        const { replayID, team1, team2, gameID, force } = req.body as BotToAutoScorerData['processgame'];
        if (!replayID || !team1 || !team2 || !gameID) return res.status(400).send({ error: 'Missing one or more fields: replayID, team1, team2, gameID' });
        console.log(`Process game ${replayID} acknowledged. Adding to queue (${gamesQueue.size})`);
        const activeBots = ScoreBots.filter(bot => bot.bot.world);
        if (activeBots.length === 0) return res.status(400).send({ error: 'Autoscore currently offline.' })
        res.send({ success: true, queueNumber: gamesQueue.size });
        gamesQueue.set(gameID.toString(), { replayID, team1, team2, gameID, force });
    },
} as MinecraftAPIRoute