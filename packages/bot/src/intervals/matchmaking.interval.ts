import { MessageCreateOptions, MessageEditOptions } from "discord.js";
import { Bot } from "../Bot";
import { Interval } from "../types/interval/Interval";
import { Util } from "../util/Util";
import moment from "moment";

export default class MatchMakingInterval extends Interval {
    constructor() {
        super('matchmaking', 5000);
    }
    async run(bot: Bot, ...args: any): Promise<void> {
        if (bot.matchMaking.groupsInQueue.size > 0) {
            bot.matchMaking.checkForMatch();
        }
    }
}