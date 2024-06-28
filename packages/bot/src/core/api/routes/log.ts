import { MessageCreateOptions } from 'discord.js';
import { BotAPIRoute } from '../BotAPI';
export type APILogOptions = {
    email: string,
    channelID: string,
    data: MessageCreateOptions
}
export default {
    type: 'post',
    path: '/log',
    async execute(bot, req, res) {
        const { email, channelID, data } = req.body as Partial<APILogOptions>;
        if (!email || !channelID || !data) return res.status(400).json({ error: 'Missing one or more of the following: email, channelID, data' });
        bot.logger.log(channelID, data);
        res.send('OK');
    }
} as BotAPIRoute;