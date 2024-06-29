import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import PartyCommand from "./party.command";

export default class PartyList extends Command {
    constructor() {
        super({
            name: 'partylist',
            aliases: ['pl'],
            description: 'See the list of players in your party.',
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig, userConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!serverConf.isQueueOpen()) return bot.createErrorEmbed(message).setDescription(`The queue is currently closed.`).send();
        if (!verifiedConfig) return bot.createErrorEmbed(message).setDescription(`You must be registered to use this command.`).send();

        const targetMember = (await bot.parseMember(args.join(' '), message.guild) || message.member);
        const verified = bot.getVerifiedUser({ id: targetMember?.id });
        if (!verified) return bot.createErrorEmbed(message).setDescription(`<@${targetMember?.id}> is not registered.`).send();
        let party = bot.partyManager.getPartyByMember(targetMember?.id || verifiedConfig.id);
        let isLeader = party?.leader.id === verifiedConfig.id;
        const subcommand = args.shift()?.toLowerCase() || '';

        PartyCommand.handlePartyList({ bot, message, verifiedConfig: verified, subcommand, isLeader, party, targetMember })
    }
}