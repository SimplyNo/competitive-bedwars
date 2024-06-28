import { InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
import { RankedGame } from "../../core/games/RankedGame";

export default class UndoCommand extends SlashCommand {
    constructor() {
        super({
            name: "undo",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("undo")
                .setDescription("Undo a scored game, voiding it.")
                .addNumberOption(option =>
                    option
                        .setName('gameid')
                        .setDescription('The game ID to void.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription(`The reason to void the game`)
                        .setRequired(true)
                )
        })
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse<boolean>> {
        const gameID = interaction.options.get('gameid')?.value as number;
        const reason = interaction.options.get('reason')?.value as string;
        const game = bot.rankedManager.getGameByID(gameID);
        if (!game) return interaction.reply({ content: `Game not found!`, ephemeral: true });
        if (game.active) return interaction.reply({ content: `Game is still active!`, ephemeral: true });
        game.void(reason);
        return bot.createEmbed(interaction)
            .setTitle(`Game ${game.id} Voided`)
            .setDescription(`Results of the game have been reverted.`)
            .send();

    }
}