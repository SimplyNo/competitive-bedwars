import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, GuildTextBasedChannel, InteractionResponse, Message, MessageCreateOptions, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Bot } from "../../Bot";
import { RawServerConfig } from "../../types/config/ServerConfig";

const messages: Partial<Record<keyof RawServerConfig, (bot: Bot) => MessageCreateOptions>> = {
    autoRoleMessage: (bot) => ({
        embeds: [
            bot.createEmbed()
                .setTitle(`Competitive Bedwars | Self Roles`)
                .setDescription(bot.config.autoRoles.map(role => `<@&${role.role}> : ${role.desc}`).join('\n'))
        ],
        components: [
            new ActionRowBuilder<ButtonBuilder>()
                .addComponents(bot.config.autoRoles.map(role => (
                    new ButtonBuilder()
                        .setLabel(`${role.name}`)
                        .setStyle(ButtonStyle.Primary)
                        .setCustomId(`autorole-${role.role}`)
                )))
        ]
    }),
    queueMessage: (bot) => ({
        embeds: [bot.createEmbed().setDescription(`Fetching queue status...`)]
    }),
    autoScoreStatusMessage: (bot) => ({
        content: `Fetching AutoScore status...`
    }),
    ticketMessage: (bot) => ({
        embeds: [
            bot.createEmbed()
                .setTitle(`Open Support Ticket`)
                .setDescription(`Choose one of the options below to open a ticket based on your issue.

General: Questions and other help.
Scoring: Voiding games, incorrect auto-score, etc.
Appeals: Competitive ban, mute, and staff decision appeals.`)
        ],
        components: [
            new ActionRowBuilder<ButtonBuilder>()
                .setComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket-create-general`)
                        .setLabel(`General`)
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`ticket-create-scoring`)
                        .setLabel(`Scoring`)
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`ticket-create-appeal`)
                        .setLabel(`Appeals`)
                        .setStyle(ButtonStyle.Primary),
                )
        ]
    }),
    jailMessage: (bot) => ({
        embeds: [
            bot.createEmbed()
                .setTitle(`a`)
                .setDescription(`a`)
        ],
        components: [
            new ActionRowBuilder<ButtonBuilder>()
                .setComponents(new ButtonBuilder().setCustomId(`punishment-info`).setLabel(`View Punishment Information`).setStyle(ButtonStyle.Secondary))
        ]
    })
}
export default class SendCommand extends SlashCommand {
    constructor() {
        super({
            name: "send",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("send")
                .setDescription("send bot message")
                .addStringOption(subcmd =>
                    subcmd
                        .setName("message")
                        .setDescription("The message to send")
                        .addChoices(Object.keys(messages).map(key => ({ name: key, value: key })))
                        .setRequired(true)
                )
                .addChannelOption(subcmd =>
                    subcmd
                        .setName("channel")
                        .setDescription("The channel to send the message to")
                        .addChannelTypes([ChannelType.GuildText])
                        .setRequired(true)

                )
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const message = interaction.options.get("message", true).value as string;
        const channel = interaction.options.get("channel", true).channel! as GuildTextBasedChannel;
        if (!messages[message]) return interaction.reply({ content: `Invalid message type`, ephemeral: true });
        const msg = await channel.send(messages[message](bot));
        serverConf.set({ [message]: { channelID: msg.channelId, messageID: msg.id } });
        return interaction.reply({ content: `[Message sent](${msg.url})`, ephemeral: true });
    }
}