import { BaseMessageOptions } from "discord.js";
import { Bot } from "../../Bot";

export class Logger {
    constructor(private bot: Bot) {

    }
    async log(channelID: string | undefined, options: BaseMessageOptions) {
        if (!channelID) return;
        const channel = await this.bot.channels.fetch(channelID).catch(e => null);
        if (!channel || !channel.isTextBased()) return this.bot.log(`[Logger] &4Failed to fetch channel ${channelID}.`);
        return channel.send(options);
    }
}