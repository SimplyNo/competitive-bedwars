import { Bot } from "../Bot";
import { Interval } from "../types/interval/Interval";
import { Util } from "../util/Util";

export default class QueueStatusMessageInterval extends Interval {
    constructor() {
        super('queuestatusmessage', 1 * 5000);
    }
    async start(bot: Bot): Promise<void> {
        this.run(bot, true);
        super.start(bot);
    }
    async run(bot: Bot, fetchMessage = false) {
        await this.updateMainQueueMessage(bot, fetchMessage);
    }
    async updateMainQueueMessage(bot: Bot, fetchMessage = false) {
        const inQueue = bot.matchMaking.getAllInQueue().length;
        const queueTextChannel = await bot.parseChannel(bot.getMainServerConfig().queueMessage?.channelID, bot.getMainGuild()!);
        if (!queueTextChannel) return;
        const queueMessageID = bot.getMainServerConfig().queueMessage?.messageID;
        let queueMessage = queueMessageID ? fetchMessage ? await queueTextChannel.messages.fetch(queueMessageID).catch(e => null) : queueTextChannel.messages.cache.get(queueMessageID) : null;
        const currentTimestamp = Date.now();
        const queueMessageOptions = bot.getMainServerConfig().isQueueOpen() ? {
            embeds: [
                bot.createEmbed()
                    .setTitle(`<:online:822183807862964225> Queue Status [OPEN]`)
                    .setDescription(`**Players Currently In Queue:** \`${inQueue}\`\n\n*Updated ${Util.getDiscordTimeFormat(currentTimestamp, 'R')}*`)
            ]
        } : {
            embeds: [
                bot.createEmbed()
                    .setTitle(`<:offline:822183808076873738> Queue Status [CLOSED]`)
                    .setDescription(`*Updated ${Util.getDiscordTimeFormat(currentTimestamp, 'R')}*`)
                    .setColor('Red')
            ]
        }
        if (!queueMessage) {
            queueMessage = await queueTextChannel.send(queueMessageOptions);
            bot.getMainServerConfig().set({
                queueMessage: {
                    messageID: queueMessage.id,
                    channelID: queueTextChannel.id
                }
            })
        } else {
            // bot.log(`&cupdating q msg`)
            await queueMessage.edit(queueMessageOptions).catch(e => console.error(`error whilst editing q msg??`, e));
            // bot.log(`&cdone updating q msg`)
        }
    }
}
