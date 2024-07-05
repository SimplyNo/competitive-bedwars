
import { Message, VoiceBasedChannel } from "discord.js";
import { Command, CommandContext } from "../../types";

export default class CallComamnd extends Command {
    constructor() {
        super({
            name: 'call',
            description: "Add a user's permission to access your game call",
            aliases: ['c'],
            usage: '<user>',
            type: 'game'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const game = bot.rankedManager.getGameByMember(message.author.id) || bot.rankedManager.getGameByTextChannel(message.channel.id);
        if (!game) return bot.createErrorEmbed(message).setDescription(`You must be in a game to use this.`).send();
        // if (!game) return bot.createErrorEmbed(message).setDescription(`You must be in a game channel to use this command.`).send();
        const user = await bot.parseMember(args[0], message.guild);
        if (!user) return bot.createErrorEmbed(message).setDescription(`Provide a valid member to add to the game call.`).send();
        let channel = <VoiceBasedChannel>await bot.parseChannel(game.game?.team1.find(p => p.id == message.author.id) ? game.game.team1Voice : game.game?.team2Voice, message.guild);
        if (!channel) return bot.createErrorEmbed(message).setDescription(`No game voice channel found or you aren't in this game!`).send()
        if (!channel.members.has(message.author.id)) return bot.createErrorEmbed(message).setDescription(`You must be connected to a game channel to add someone.`).send();
        if (channel.permissionOverwrites.cache.get(user.id)?.allow.has('Connect')) return bot.createErrorEmbed(message).setDescription(`<@${user.id}> already has permission to connect to the channel!`).send();
        channel.permissionOverwrites.edit(user.id, { Connect: true, Speak: false });
        channel.setUserLimit(channel.userLimit + 1);
        const msg = await message.reply({ embeds: [bot.createSuccessEmbed(message).setDescription(`Added <@${user.id}> to the game call!`)] });
        const col = msg.createMessageComponentCollector({ time: 60000 });
        col
            .on('collect', (btn) => {
                if (!channel.permissionsFor(btn.user)?.has('Connect')) return btn.reply({ content: 'You do not have permission to connect to this channel.', ephemeral: true });
                user.voice.setChannel(channel).then(e => {
                    btn.deferUpdate();
                    col.stop()
                }).catch(e => {
                    btn.reply({ content: 'You are not in a voice channel.', ephemeral: true })
                });
            })
            .on('end', () => {
                msg.edit({
                    components: []
                }).catch(e => e)
            })
    }

}