import { Bot } from "../Bot";
import { Interval } from "../types/interval/Interval";

/**
 * 0 = check mutes
 * 1 = check bans
 * 2 = check rank bans
*/
let currentCheck = 0;
export default class ModerationInterval extends Interval {
    constructor() {
        super('moderation', 1000)
    }
    async run(bot: Bot, ...args: any): Promise<void> {
        // console.log('check:', currentCheck)
        switch (currentCheck) {
            case 0:
                this.checkMutes(bot);
                break;
            case 1:
                this.checkBans(bot);
                break;
            case 2:
                this.checkRankBans(bot);
                currentCheck = -1;
                break;
            default:
                break;
        }
        currentCheck++;
    }
    async checkMutes(bot: Bot) {
        let allMutes = bot.getAllUsers().filter((val) => val.mute);
        for (const user of allMutes) {
            let userConfig = bot.getUser(user.id);
            if (userConfig.mute) {
                if (userConfig.mute.end < Date.now()) {
                    userConfig.moderate().unmute(bot.user!.id, 'Mute expired');
                }
            }
        }
    }
    async checkBans(bot: Bot) {
        let allBans = bot.getAllUsers().filter(val => val.ban?.end);
        for (const user of allBans) {
            let userConfig = bot.getUser(user.id);
            if (userConfig.ban?.end) {
                if (userConfig.ban?.end < Date.now()) {
                    console.log(`Unbanning user`);
                    userConfig.moderate().unban(bot.user!.id, 'Ban expired');
                }
            }
        }
    }
    async checkRankBans(bot: Bot) {
        let allRankBans = bot.getAllUsers().filter(val => val.rankBan?.end);
        for (const user of allRankBans) {
            let userConfig = bot.getUser(user.id);
            if (userConfig.rankBan?.end) {
                if (userConfig.rankBan?.end < Date.now()) {
                    console.log(`Unbanning user from ranked`);
                    userConfig.moderate().rankUnban(bot.user!.id, 'Ranked ban expired');
                }
            }
        }
    }
}

