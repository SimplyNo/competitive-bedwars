import { InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class RescoreCommand extends SlashCommand {
    constructor() {
        super({
            name: "rescore",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("rescore")
                .setDescription("Rescore a game")
                .addNumberOption(subcmd =>
                    subcmd
                        .setName("gameid")
                        .setDescription("The game ID")
                        .setRequired(true))
                .addStringOption(subcmd =>
                    subcmd
                        .setName("replayid")
                        .setDescription("The replay ID of the game.")
                        .setRequired(true)
                )
        })
    }
    async run({ bot, interaction, serverConf, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const gameID = interaction.options.get("gameid", true).value as number;
        const replay = interaction.options.get("replayid", true).value as string;
        const game = bot.rankedManager.getGameByID(gameID);
        if (!game) return interaction.reply({ embeds: [bot.createErrorEmbed().setDescription(`**Game ${gameID}** not found`)] });
        const replayID = replay.match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gm)?.[0];
        if (!replayID) return bot.createErrorEmbed(interaction).setDescription(`Failed to parse replay ID. Please provide a valid replay ID/command to be scored.`).send()
        const queue = await bot.api.autoscore.send('processgame', {
            gameID: game.id,
            replayID,
            force: true,
            team1: game.getTeamPlayers('team1').map(p => ({ uuid: p.uuid!, username: p.getGameNickname() })),
            team2: game.getTeamPlayers('team2').map(p => ({ uuid: p.uuid!, username: p.getGameNickname() })),
        });
        game.update({ replayScoring: { replayID } });
        bot.createSuccessEmbed(interaction).setDescription(`Successfully rescoring **Game ${game.id}** using replay ID: \`${replayID}\``).send();
    }
}