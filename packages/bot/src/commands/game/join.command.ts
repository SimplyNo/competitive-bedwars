import { Collection, Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { cpuUsage, } from "os-utils";
import { Util } from "../../util/Util";
const voided = new Collection<number, string>();
export default class JoinCommand extends Command {
    constructor() {
        super({
            name: 'join',
            aliases: ['j'],
            description: 'Join the queue while being in any voice channel.',
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!verifiedConfig) return bot.createErrorEmbed(message).setDescription(`You must be verified to use this command.`).send();
        if (await verifiedConfig.getUser().isFrozen()) return bot.createErrorEmbed(message).setDescription(`You are currently frozen and cannot join the queue.`).send();

        const connectedToChannel = message.member?.voice.channel;
        const game = bot.rankedManager.getGameByMember(message.member?.id!);
        if (game) return bot.createErrorEmbed(message).setDescription(`You can't join the queue while being in a game.`).send();

        if (!connectedToChannel) return bot.createErrorEmbed(message).setDescription(`You must be connected to a voice channel to use this command.`).send();
        const party = verifiedConfig.getUser().getParty();
        let partyMsg = "";
        const isInQueue = bot.matchMaking.isInQueue(verifiedConfig);
        bot.matchMaking.add(verifiedConfig);
        if (party) {
            if (party.leader.id === message.author.id) {
                for (const mem of party.members) {
                    if (mem.id === party.leader.id) continue;
                    const member = await mem.getUser().resolveMember();
                    if (member?.voice.channel) bot.matchMaking.add(mem);
                }
            }
            const connectedMembers = bot.matchMaking.getAllInQueue().filter(e => party.members.find(m => m.id == e.id));
            partyMsg = `**Party Members Connected:** \`(${connectedMembers.length}/${party.members.length})\`
${party.members.map(m => `<@${m.id}> ${bot.matchMaking.isInQueue(m) || m.id === message.author.id ? `` : `Not connected to VC`}`).join('\n')}`
        }
        if (isInQueue) return bot.createErrorEmbed(message).setDescription(`You are already in the queue.\n\n${partyMsg}`).send();
        const elo = verifiedConfig.rbw.elo || 0;
        verifiedConfig.set({ queueJoin: true });
        return bot.createSuccessEmbed(message).setDescription(`You have joined the queue.\n\n${partyMsg}`).send()



    }
}