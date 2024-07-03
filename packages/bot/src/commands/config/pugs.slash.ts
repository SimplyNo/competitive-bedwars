import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { getPugsEmbed } from "../../events/interactionCreate/pugsVote";

export default class PugsCommand extends SlashCommand {
    constructor() {
        super({
            name: 'pugs',
            slash: new SlashCommandBuilder()
                .setName('pugs')
                .setDescription('Manage pugs')
                .addSubcommand(subcmd =>
                    subcmd
                        .setName('vote')
                        .setDescription('Sends the vote message for pugs')
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription(`The user that will be voted on`)
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcmd =>
                    subcmd
                        .setName('add')
                        .setDescription(`Add a user to pugs`)
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription(`The user that will be added to pugs`)
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcmd =>
                    subcmd
                        .setName('remove')
                        .setDescription(`Remove a user from pugs`)
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription(`The user that will be removed from pugs`)
                                .setRequired(true)
                        )
                )
        })
    }
    async run({ bot, interaction, serverConf, userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user', true);
        const registered = bot.getVerifiedUser({ id: user.id });
        if (!registered) return bot.createErrorEmbed(interaction).setDescription(`${user} is not registered!`).send();
        const member = await registered.getUser().resolveMember();
        if (subcommand === 'vote') {
            registered.getUser().set({ pugUpvotes: 0, pugDownvotes: 0 });
            const msg = await bot.logger.log(bot.config.channels.pugsVoting, {
                embeds: [
                    getPugsEmbed(bot, registered.getUser())
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel(`Upvote`)
                                .setCustomId(`pugsvoting-${registered.id}-upvote`)
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setLabel(`Downvote`)
                                .setCustomId(`pugsvoting-${registered.id}-downvote`)
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setLabel(`End Vote`)
                                .setCustomId(`pugsvoting-${registered.id}-endvote`)
                                .setStyle(ButtonStyle.Secondary)

                        )
                ]
            })
            await interaction.reply({ content: `Vote message sent. ${msg?.url}` });
        }
        if (subcommand === 'add') {
            if (!member) return bot.createErrorEmbed(interaction).setDescription(`Failed to fetch member, ${user}`).send();
            if (member.roles.cache.has(bot.config.roles.pugs)) return bot.createErrorEmbed(interaction).setDescription(`${user} is already in pugs!`).send();
            await member.roles.add(bot.config.roles.pugs).catch(e => null);
            return bot.createSuccessEmbed(interaction).setDescription(`${user} has been added to pugs!`).send();
        }
        if (subcommand === 'remove') {
            if (!member) return bot.createErrorEmbed(interaction).setDescription(`Failed to fetch member, ${user}`).send();
            if (!member.roles.cache.has(bot.config.roles.pugs)) return bot.createErrorEmbed(interaction).setDescription(`${user} is not in pugs!`).send();
            await member.roles.remove(bot.config.roles.pugs).catch(e => null);
            return bot.createSuccessEmbed(interaction).setDescription(`${user} has been removed from pugs!`).send();
        }
    }
}