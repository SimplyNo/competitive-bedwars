
import { Message, OverwriteType, VoiceBasedChannel } from "discord.js";
import { Command, CommandContext } from "../../types";

export default class CallRemoveComamnd extends Command {
    constructor() {
        super({
            name: 'callremove',
            description: "Remove a user's permission to access your game call",
            aliases: ['cr'],
            usage: '<user>',
            type: 'game'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const game = bot.rankedManager.getGameByTextChannel(message.channel.id);
        if (!game) return bot.createErrorEmbed(message).setDescription(`You must be in a game channel to use this command.`).send();
        const user = await bot.parseMember(args[0], message.guild);
        if (!user) return bot.createErrorEmbed(message).setDescription(`Provide a valid member to remove from the game call.`).send();
        let channel = <VoiceBasedChannel>await bot.parseChannel(game.game?.team1.find(p => p.id == message.author.id) ? game.game.team1Voice : game.game?.team2Voice, message.guild);
        if (!channel) return bot.createErrorEmbed(message).setDescription(`No game voice channel found.`).send()
        if (!channel.members.has(message.author.id)) return bot.createErrorEmbed(message).setDescription(`You must be connected to the channel to remove someone.`).send();
        if (!channel.permissionOverwrites.cache.get(user.id)?.allow.has('Connect')) return bot.createErrorEmbed(message).setDescription(`<@${user.id}> doesn't have permission to connect to the channel!`).send();
        channel.permissionOverwrites.delete(user.id);
        channel.setUserLimit(channel.userLimit - 1);
        return bot.createSuccessEmbed(message).setDescription(`Removed <@${user.id}> from the game call!`).send();
    }

}