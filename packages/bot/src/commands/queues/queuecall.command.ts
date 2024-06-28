
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message, VoiceBasedChannel } from "discord.js";
import { Command, CommandContext } from "../../types";

export default class QueueComamnd extends Command {
    constructor() {
        super({
            name: 'queuecall',
            description: "Add a user's permission to access your queue call",
            aliases: ['qc'],
            usage: 'queuecall <user>',
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!verifiedConfig) return bot.createErrorEmbed(message).setDescription(`You must be verified to use this command.`).send()
        const channel = await bot.matchMaking.getQueueChannel(verifiedConfig, false);
        if (!channel) return bot.createErrorEmbed(message).setDescription(`You do not have an active queue channel!`).send();
        const user = await bot.parseMember(args[0], message.guild);
        if (!user) return bot.createErrorEmbed(message).setDescription(`Provide a valid member to add to the queue call.`).send();
        if (!channel.members.has(message.author.id)) return bot.createErrorEmbed(message).setDescription(`You must be connected to the channel to add someone.`).send();
        if (channel.permissionOverwrites.cache.get(user.id)?.allow.has('Connect')) return bot.createErrorEmbed(message).setDescription(`<@${user.id}> already has permission to connect to the channel!`).send();
        channel.permissionOverwrites.edit(user.id, { Connect: true, ViewChannel: true });
        const msg = await message.reply({
            embeds: [
                bot.createSuccessEmbed().setDescription(`Added <@${user.id}> to the queue call!`)
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(new ButtonBuilder().setCustomId('join').setLabel(`Join VC`).setStyle(ButtonStyle.Primary))
            ]
        })
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