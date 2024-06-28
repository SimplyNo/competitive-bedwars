import { Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class AdminlockCommand extends SlashCommand {
    constructor() {
        super({
            name: "adminlock",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("adminlock")
                .setDescription("locks the channel so only admins can see the channel")
        })
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        const { channel } = interaction;
        if (!channel) return bot.createErrorEmbed(interaction).setDescription(`Command is ran in a non-channel?`).send();
        const ticket = serverConf.ticketManager().getTicketByChannel(channel.id)
        if (!ticket) return bot.createErrorEmbed(interaction).setDescription(`This command can only be ran in ticket channels.`).send();
        await ticket.setRolePerms(bot.config.roles.admin);

        return bot.createSuccessEmbed(interaction)
            .setDescription(`Ticket has been admin locked.`)
            .send();

    }
}