import { Bot } from "../Bot";
import { Interval } from "../types/interval/Interval";
import { Util } from "../util/Util";

export default class QueueStatusInterval extends Interval {
    constructor() {
        super('queuestatus', 1 * 1000);
    }
    async start(bot: Bot): Promise<void> {
        this.run(bot, true);
        super.start(bot);
    }
    async run(bot: Bot, fetchMessage = false) {
        // update all the queue messages
        this.updateQueueStatusMessages(bot);
        // check queues 


    }


    private updateQueueStatusMessages(bot: Bot) {
        Object.entries(bot.getMainServerConfig().partyChannels).filter(([id, c]) => c).forEach(async ([leaderID, channel]) => {
            // console.log(leaderID, channel)
            const verified = bot.getVerifiedUser({ id: leaderID });
            if (verified) {
                const party = verified.getUser().getParty();
                if (!party || party.leader.id == leaderID) {
                    // bot.log(`&6updating queue message for ${leaderID}`)
                    bot.matchMaking.updateQueueMessage(verified);
                }
            }
        });
    }
}
