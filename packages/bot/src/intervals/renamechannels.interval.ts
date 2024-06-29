import { Bot } from "../Bot";
import { Interval } from "../types/interval/Interval";

export default class RenameChannelInterval extends Interval {
    constructor() {
        super('renamechannel', 5 * 60 * 1000);
    }
    async start(bot: Bot): Promise<void> {
        this.run(bot);
        super.start(bot);
    }
    async run(bot: Bot, ...args: any) {
        if (!bot.getMainServerConfig().isQueueOpen()) return;
        const queueChannel = await bot.parseChannel(bot.config.channels.queue, bot.getMainGuild()!);
        const playing = bot.rankedManager.getActiveGames().reduce((acc, game) => acc + game.players.length, 0);
        const inQueue = bot.matchMaking.getAllInQueue().length;
        const total = Math.max(Math.floor((playing + inQueue) / 5) * 5, playing + inQueue);
        queueChannel?.setName(`Queue (${total}+ Playing)`)
    }
}
