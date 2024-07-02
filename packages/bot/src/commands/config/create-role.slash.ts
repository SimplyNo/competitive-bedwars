import { ActionRow, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, GuildTextBasedChannel, InteractionResponse, Message, MessageCreateOptions, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Bot } from "../../Bot";
import { RawServerConfig } from "../../types/config/ServerConfig";

export default class CreateRoleCommand extends SlashCommand {
    constructor() {
        super({
            name: "create-role",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("create-role")
                .setDescription("creates a role")
                .addStringOption(subcmd =>
                    subcmd
                        .setName("name")
                        .setDescription("The name of the role")
                        .setRequired(true)
                )
        });
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const name = interaction.options.get("name", true).value as string;
        const role = await interaction.guild.roles.create({ name }).catch(e => null);
        if (!role) return bot.createErrorEmbed(interaction).setDescription(`Failed to create role.`).send();
        return bot.createSuccessEmbed(interaction).setDescription(`Created role <@&${role.id}>. ID: \`${role.id}\``).send();
    }
}