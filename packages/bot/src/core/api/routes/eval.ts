import { BotAPIRoute } from '../BotAPI';
export type APIEvalOptions = {
    data: string
}
export default {
    type: 'post',
    path: '/eval',
    async execute(bot, req, res) {
        const { data } = req.body as APIEvalOptions;
        if (!data) return res.status(400).json({ error: 'Missing data' });
        try {
            const result = eval(data);
            res.send(result);
        } catch (e) {
            res.status(500).send(e.message);
        }
    }
} as BotAPIRoute;