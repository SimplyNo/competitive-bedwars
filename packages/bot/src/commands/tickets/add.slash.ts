import { Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class AddCommand extends SlashCommand {
    constructor() {
        super({
            name: "add",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("add")
                .setDescription("Add a user to the ticket")
                .addUserOption(subcmd =>
                    subcmd
                        .setName("user")
                        .setDescription("The user to add")
                        .setRequired(true))
        });
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        const user = interaction.options.get("user", true).user!;
        const userconfig = bot.getUser(user.id);
        const { channel } = interaction;
        if (!channel) return bot.createErrorEmbed(interaction).setDescription(`Command is ran in a non-channel?`).send();
        const ticket = serverConf.ticketManager().getTicketByChannel(channel.id)
        if (!ticket) return bot.createErrorEmbed(interaction).setDescription(`This command can only be ran in ticket channels.`).send();
        await ticket.addUser(user.id);

        return bot.createSuccessEmbed(interaction)
            .setDescription(`${user} has been added to the ticket.`)
            .send();

    }
}