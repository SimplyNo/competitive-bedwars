import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class PremiumCommand extends SlashCommand {
    constructor() {
        super({
            name: 'premium',
            slash: new SlashCommandBuilder()
                .setName('premium')
                .setDescription('Manage premiums')
                .addSubcommand(subcmd =>
                    subcmd
                        .setName('add')
                        .setDescription(`Add a user to premium`)
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription(`The user that will be added to premium`)
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcmd =>
                    subcmd
                        .setName('remove')
                        .setDescription(`Remove a user from premium`)
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription(`The user that will be removed from premium`)
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
        if (subcommand === 'add') {
            if (!member) return bot.createErrorEmbed(interaction).setDescription(`Failed to fetch member, ${user}`).send();
            if (member.roles.cache.has(bot.config.roles.premium)) return bot.createErrorEmbed(interaction).setDescription(`${user} is already in premium!`).send();
            await member.roles.add(bot.config.roles.premium).catch(e => null);
            return bot.createSuccessEmbed(interaction).setDescription(`${user} has been added to premium!`).send();
        }
        if (subcommand === 'remove') {
            if (!member) return bot.createErrorEmbed(interaction).setDescription(`Failed to fetch member, ${user}`).send();
            if (!member.roles.cache.has(bot.config.roles.premium)) return bot.createErrorEmbed(interaction).setDescription(`${user} is not in premium!`).send();
            await member.roles.remove(bot.config.roles.premium).catch(e => null);
            return bot.createSuccessEmbed(interaction).setDescription(`${user} has been removed from premium!`).send();
        }
    }
}