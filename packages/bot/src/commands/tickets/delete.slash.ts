import { InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class DeleteCommand extends SlashCommand {
    constructor() {
        super({
            name: "delete",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName('delete')
                .setDescription(`Deletes the ticket with ticket archives`)
        });
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        const { channel } = interaction;
        if (!channel) return bot.createErrorEmbed(interaction).setDescription(`Command is ran in a non-channel?`).send();
        const ticket = serverConf.ticketManager().getTicketByChannel(channel.id)
        if (!ticket) return bot.createErrorEmbed(interaction).setDescription(`This command can only be ran in ticket channels.`).send();
        ticket.delete(interaction.member);

        return bot.createSuccessEmbed(interaction)
            .setDescription(`Deleting ticket.`)
            .send();

    }
}