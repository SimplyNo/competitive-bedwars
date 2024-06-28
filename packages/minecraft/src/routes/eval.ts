import { ScoreBots } from "..";
import { BotToAutoScorerData, MinecraftAPIRoute } from "../AutoscoreAPI";

export default {
    type: 'post',
    path: '/eval',
    async execute(req, res) {
        const { data } = req.body as BotToAutoScorerData['eval'];
        let result: any;
        const scorebots = ScoreBots;
        try {
            console.log(`eval:`, data)
            result = await eval(data);
            res.send({ result: String(result) });
        } catch (e) {
            console.error(`eval error`, e);
            return res.status(500).send({ error: e.message });
        }
    },
} as MinecraftAPIRoute