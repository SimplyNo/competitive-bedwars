import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";

export default class QueueCallComamnd extends Command {
    constructor() {
        super({
            name: 'queuecallremove',
            description: "Remove a user's permission to access your queue call",
            aliases: ['qcr'],
            usage: '<user>',
            type: 'queue'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!verifiedConfig) return bot.createErrorEmbed(message).setDescription(`You must be verified to use this command.`).send()
        const channel = await bot.matchMaking.getQueueChannel(verifiedConfig, false);
        if (!channel) return bot.createErrorEmbed(message).setDescription(`You do not have an active queue channel!`).send();
        const user = await bot.parseMember(args[0], message.guild);
        if (!user) return bot.createErrorEmbed(message).setDescription(`Provide a valid member to remove from the queue call.`).send();
        if (!channel.members.has(message.author.id)) return bot.createErrorEmbed(message).setDescription(`You must be connected to the channel to remove someone.`).send();
        if (!channel.permissionOverwrites.cache.get(user.id)?.allow.has('Connect')) return bot.createErrorEmbed(message).setDescription(`<@${user.id}> doesn't have permission to connect to the channel!`).send();
        channel.permissionOverwrites.delete(user.id);
        user.voice.setChannel(null).catch(e => null);
        return bot.createSuccessEmbed(message).setDescription(`Removed <@${user.id}> from the queue call!`).send();
    }

}