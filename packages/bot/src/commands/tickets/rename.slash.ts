import { Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class RenameCommand extends SlashCommand {
    constructor() {
        super({
            name: "rename",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("rename")
                .setDescription("renames the channel name to the name inserted")
                .addStringOption(subcmd =>
                    subcmd
                        .setName('name')
                        .setDescription('Name to rename ticket to')
                        .setRequired(true)
                )
        });
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        const name = interaction.options.get("name", true).value! as string;
        const { channel } = interaction;
        if (!channel) return bot.createErrorEmbed(interaction).setDescription(`Command is ran in a non-channel?`).send();
        const ticket = serverConf.ticketManager().getTicketByChannel(channel.id)
        if (!ticket) return bot.createErrorEmbed(interaction).setDescription(`This command can only be ran in ticket channels.`).send();
        await ticket.setName(name);

        return bot.createSuccessEmbed(interaction)
            .setDescription(`Ticket renamed to **${name}**`)
            .send();
    }
}