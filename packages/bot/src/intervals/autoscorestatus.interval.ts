import { MessageCreateOptions, MessageEditOptions } from "discord.js";
import { Bot } from "../Bot";
import { Interval } from "../types/interval/Interval";
import { Util } from "../util/Util";
import moment from "moment";

export default class AutoScoreStatusInterval extends Interval {
    constructor() {
        super('autoscorestatus', 5000);
    }
    async run(bot: Bot, ...args: any): Promise<void> {
        const status = await bot.api.autoscore.get('status');
        const { channelID, messageID } = bot.getStaffServerConfig().autoScoreStatusMessage || {};
        if (!channelID || !messageID) return;
        const channel = await bot.parseChannel(channelID, bot.getStaffGuild()!);
        if (!channel) return;
        const message = await channel.messages.fetch(messageID).catch(e => null);
        let msg: MessageEditOptions;
        if (!status) {
            msg = {
                content: `\`\`\`ansi
[2;31m[AUTOSCORE DOWN] Failed to reach AutoScore process...[0m
\`\`\``
            }
        } else {
            const statusMessages = status?.bots.map((bot: any) => {
                const { online, activeGame, username, uptime } = bot;
                return `[0m[2;30m[0m[2;34m[2;37m${online ? '🟢' : '🔴'} ${username}[0m[2;34m [2;30m: ${online ? `[2;31m[2;32mONLINE (${moment.duration(uptime).humanize()})` : `[2;31mOFFLINE`}${`[0m[2;34m [2;30m: [2;34m[2;37m[2;33m[2;35m[2;33m[2;36m${activeGame ? `Watching Game #${activeGame.game.gameID} (${activeGame.currentTime}/${activeGame.totalTime})` : `Not watching game`}`}`
            });

            msg = {
                content: `\`\`\`ansi
Bots Online: [2;32m${status.bots.filter((b: any) => b.online).length}[2;37m/[0m[2;32m${status.bots.length}
[2;37m-------------------------------------------
${statusMessages.join('\n') || "Failed to find bots."}
\`\`\``
            }
        }
        msg = {
            ...msg,
            content: `Updated ${Util.getDiscordTimeFormat(Date.now(), "R")}\n` + msg.content
        }

        if (message) {
            await message.edit(msg).catch(e => null);
        } else {
            const newMsg = await channel.send(msg as MessageCreateOptions).catch(e => null);
            if (!newMsg) return;
            bot.getStaffServerConfig().set({
                autoScoreStatusMessage: {
                    channelID: channel.id,
                    messageID: newMsg.id
                }
            })
        }

    }
}