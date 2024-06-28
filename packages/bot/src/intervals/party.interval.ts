import { ChannelType, Collection, VoiceBasedChannel } from "discord.js";
import { Bot } from "../Bot";
import { Interval } from "../types/interval/Interval";

export default class Party extends Interval {
    constructor() {
        super('party', 1000)
    }
    async run(bot: Bot, ...args: any): Promise<void> {
        const allParties = bot.partyManager.getAllParties();
        const allChannels = bot.getMainGuild()!.channels.cache.filter(c => c.type == ChannelType.GuildVoice) as Collection<string, VoiceBasedChannel>;
        for (const party of allParties) {
            const { members } = party;
            // check that all the members are in the same voice channel, if not set inactivity to the current time
            // if all members are in the same voice channel, set inactivity to null 
            const voiceChannels = members.map(m => allChannels?.find(c => c.members.has(m?.id)));
            const isAllInSameChannel = voiceChannels.every((val, i, arr) => val?.id === arr[0]?.id);
            const isAllInAChannel = voiceChannels.every(val => val);
            // console.log('voicechannels:', voiceChannels)
            // console.log(`inactiveSince:`, party.inactiveSince)
            // console.log(`isAllInSameChannel: ${isAllInSameChannel}`)
            // console.log(`isAllInChannel: ${isAllInAChannel}`)
            if (!isAllInSameChannel || !isAllInAChannel) {
                if (!party.inactiveSince) party.setInactivity(Date.now());
            } else {
                party.setInactivity(null);
            }
            // if the party has been inactive for 10 minutes, disband it
            if (party.inactiveSince && Date.now() - party.inactiveSince > (10 * 60 * 1000)) {
                party.disband();
                bot.log(`&e[PARTY] Party with leader ${party.leader.username} has been disbanded due to inactivity.`)
                bot.logger.log(bot.config.channels.partyAlerts, {
                    content: `${members.map(m => `<@${m.id}>`).join(' ')}`,
                    embeds: [
                        bot.createErrorEmbed()
                            .setDescription(`The party has been automatically disbanded due to inactivity.`)
                    ]
                })
            }
        }
    }
}