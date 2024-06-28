import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message, MessageReaction } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";

export default class StrikeRequestCommand extends Command {
    constructor() {
        super({
            name: 'strikerequest',
            aliases: ['sr'],
            description: 'Request strike of player',
            usage: '@user',
            cooldown: 3,
            type: 'moderation',
        })
    }
    async run({ args, bot, flags, message, prefix, serverConf, userConfig, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const user = message.mentions.members.first();
        if (!user) return message.reply(`You did not mention a user to strike request.`);
        if (user.id === message.author.id) return message.reply(`You cannot strike request yourself.`);
        const attachments = message.attachments.map(a => a.url);
        const hasMoreThanJustMention = args.join(' ').length > message.mentions.users.first()?.toString().length! + 1;
        if (!hasMoreThanJustMention && !attachments.length) return message.reply(`You need to provide a reason and/or image to strike request.`);
        message.react('✅')
        bot.createEmbed(message).setDescription(`Strike request has been submitted against ${user}.`).send().then(msg => {
            setTimeout(() => {
                msg.delete();
            }, 5000)
        });
        bot.logger.log(bot.config.channels.strikerequests, {
            embeds: [
                bot.createEmbed()
                    .setTitle(`Strike Request Submitted`)
                    .setDescription(`Requested by: \`${message.author.username}\` (${message.author})\nRequested against: \`${user.user.username}\` (${message.author})`)
                    .addFields([{ name: `Full Message`, value: `${message.content}` }])
                    .setImage(attachments[0] || null)
                    .setTimestamp()
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder().setCustomId(`sr-accept-${user.id}-${message.author.id}-${message.channelId}-${message.id}`).setLabel(`Accept`).setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId(`sr-deny-${user.id}-${message.author.id}-${message.channelId}-${message.id}`).setLabel(`Deny`).setStyle(ButtonStyle.Danger),
                    ),
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder().setLabel('Go To Message').setURL(`${message.url}`).setStyle(ButtonStyle.Link)
                    )
            ]
        })
    }
}