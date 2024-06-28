import { Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class AddCommand extends SlashCommand {
    constructor() {
        super({
            name: "modlock",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("modlock")
                .setDescription("locks the channel so only moderators and above can see it")
        });
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        const { channel } = interaction;
        if (!channel) return bot.createErrorEmbed(interaction).setDescription(`Command is ran in a non-channel?`).send();
        const ticket = serverConf.ticketManager().getTicketByChannel(channel.id)
        if (!ticket) return bot.createErrorEmbed(interaction).setDescription(`This command can only be ran in ticket channels.`).send();
        await ticket.setRolePerms(bot.config.roles.staff);

        return bot.createSuccessEmbed(interaction)
            .setDescription(`Ticket has been moderator locked.`)
            .send();

    }
}