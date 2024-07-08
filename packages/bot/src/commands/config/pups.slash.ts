import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { getPupsEmbed } from "../../events/interactionCreate/pupsVote";

export default class PupsCommand extends SlashCommand {
    constructor() {
        super({
            name: 'pups',
            slash: new SlashCommandBuilder()
                .setName('pups')
                .setDescription('Manage pups')
                .addSubcommand(subcmd =>
                    subcmd
                        .setName('vote')
                        .setDescription('Sends the vote message for pups')
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
                        .setDescription(`Add a user to pups`)
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription(`The user that will be added to pups`)
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcmd =>
                    subcmd
                        .setName('remove')
                        .setDescription(`Remove a user from pups`)
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription(`The user that will be removed from pups`)
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
            registered.getUser().set({ pupUpvotes: 0, pupDownvotes: 0 });
            const msg = await bot.logger.log(bot.config.channels.pupsVoting, {
                embeds: [
                    getPupsEmbed(bot, registered.getUser())
                ],
                components: [
                    new ActionRowBuilder<ButtonBuilder>()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel(`Upvote`)
                                .setCustomId(`pupsvoting-${registered.id}-upvote`)
                                .setStyle(ButtonStyle.Success),
                            new ButtonBuilder()
                                .setLabel(`Downvote`)
                                .setCustomId(`pupsvoting-${registered.id}-downvote`)
                                .setStyle(ButtonStyle.Danger),
                            new ButtonBuilder()
                                .setLabel(`End Vote`)
                                .setCustomId(`pupsvoting-${registered.id}-endvote`)
                                .setStyle(ButtonStyle.Secondary)

                        )
                ]
            })
            await interaction.reply({ content: `Vote message sent. ${msg?.url}` });
        }
        if (subcommand === 'add') {
            if (!member) return bot.createErrorEmbed(interaction).setDescription(`Failed to fetch member, ${user}`).send();
            if (member.roles.cache.has(bot.config.roles.pups)) return bot.createErrorEmbed(interaction).setDescription(`${user} is already in pups!`).send();
            await member.roles.add(bot.config.roles.pups).catch(e => null);
            return bot.createSuccessEmbed(interaction).setDescription(`${user} has been added to pups!`).send();
        }
        if (subcommand === 'remove') {
            if (!member) return bot.createErrorEmbed(interaction).setDescription(`Failed to fetch member, ${user}`).send();
            if (!member.roles.cache.has(bot.config.roles.pups)) return bot.createErrorEmbed(interaction).setDescription(`${user} is not in pups!`).send();
            await member.roles.remove(bot.config.roles.pups).catch(e => null);
            return bot.createSuccessEmbed(interaction).setDescription(`${user} has been removed from pups!`).send();
        }
    }
}