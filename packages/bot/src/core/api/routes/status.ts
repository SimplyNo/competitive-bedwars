import { BotAPIRoute } from '../BotAPI';
export type APIStatusOptions = {
    type: "scoring_fail",
    gameID: number,
    reason: "replay_invalid"
}
export default {
    type: 'post',
    path: '/status',
    async execute(bot, req, res) {
        const { type } = req.body as Partial<APIStatusOptions>;
        if (!type) return res.status(400).json({ error: 'Missing one or more of the following: type' });

    }
} as BotAPIRoute;