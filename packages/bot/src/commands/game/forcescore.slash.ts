import { InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
import { RankedGame } from "../../core/games/RankedGame";

export default class ForceScoreCommand extends SlashCommand {
    constructor() {
        super({
            name: "forcescore",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("forcescore")
                .setDescription("Force score a game.")
                .addNumberOption(option =>
                    option
                        .setName('gameid')
                        .setDescription('The game ID to force score.')
                        .setRequired(true)
                )
                .addNumberOption(option =>
                    option
                        .setName(`winningteam`)
                        .setDescription(`the winning team number`)
                        .setAutocomplete(true)
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName(`mvp`)
                        .setDescription(`MVP(s) of the game. Username separated by commas, E.g. simplyno, videocalls `)
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option
                        .setName(`bedbreakers`)
                        .setDescription(`Bed breakers of game. Username separated by commas, E.g. simplyno, videocalls`)
                        .setRequired(false)
                )
        })
    }
    async autocomplete({ bot, interaction, serverConf, userConfig, verifiedConfig }: AutoCompleteContext): Promise<void> {
        console.log(`autocomplet.`)
        const gameID = interaction.options.get('gameid')?.value as number;
        const game = bot.rankedManager.getGameByID(gameID);
        if (!game) return interaction.respond([{ name: 'Invalid game ID', value: -1 }]);
        if (game.players.some(p => !p)) return interaction.respond([{ name: `${game.players.filter(p => !p).map(p => `A player was not found in this game`)}`, value: -1 }]);
        const team1 = game.game?.team1.map(p => game.players.find(p1 => p1.id == p.id));
        const team2 = game.game?.team2.map(p => game.players.find(p1 => p1.id == p.id));
        if (!team1 || !team2) return interaction.respond([{ name: 'Teams not found!', value: -1 }]);
        interaction.respond([
            { name: `Team 1: ${team1.map(p => p?.username).join(', ')}`, value: 1 },
            { name: `Team 2: ${team2.map(p => p?.username).join(', ')}`, value: 2 }
        ])
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse<boolean>> {
        const gameID = interaction.options.get('gameid')?.value as number;
        const winningTeam = interaction.options.get('winningteam')?.value as number;
        const mvp = interaction.options.get('mvp')?.value as string || "";
        const bedBreaker = interaction.options.get('bedbreakers')?.value as string || "";
        const game = bot.rankedManager.getGameByID(gameID);
        if (!game) return interaction.reply({ content: `Game not found!`, ephemeral: true });
        const team1 = game.game?.team1.map(p => game.players.find(p1 => p1.id == p.id));
        const team2 = game.game?.team2.map(p => game.players.find(p1 => p1.id == p.id));
        if (!team1 || !team2) return interaction.reply({ content: `Teams not found!`, ephemeral: true });
        const team1Win = winningTeam === 1;
        const team2Win = winningTeam === 2;
        if (!team1Win && !team2Win) return interaction.reply({ content: `Invalid winning team!`, ephemeral: true });
        let mvps: VerifiedConfig[] = [];
        for (const unparsed of mvp.split(',').map(m => m.trim())) {
            if (!unparsed) continue;
            const verified = bot.getVerifiedUser({ username: unparsed });
            const player = game.players.find(p => p.id === verified?.id);
            if (!player) return interaction.reply({ content: `Could not assign MVP to **${unparsed}** as they weren't found in the game.`, ephemeral: true });
            mvps.push(player);
        }
        let bedBreakers: VerifiedConfig[] = [];
        for (const unparsed of bedBreaker.split(',').map(m => m.trim())) {
            if (!unparsed) continue;
            const verified = bot.getVerifiedUser({ username: unparsed });
            const player = game.players.find(p => p.id === verified?.id);
            if (!player) return interaction.reply({ content: `Could not assign bed breaker to **${unparsed}** as they weren't found in the game.`, ephemeral: true });
            bedBreakers.push(player);
        }
        const getGameString = ({ voided, players, created, results, game }: RankedGame) => {
            if (voided) return `Game Voided: *${voided.reason}*`;
            const team1 = game?.team1.map(player => ({ ...players.find(p => player.id == p.id), captain: player.captain })) || null;
            const team2 = game?.team2.map(player => ({ ...players.find(p => player.id == p.id), captain: player.captain })) || null;
            const winners = results?.winner == 'team1' ? team1 : results?.winner === 'team2' ? team2 : undefined;
            const losers = results?.winner == 'team1' ? team2 : results?.winner === 'team2' ? team1 : undefined;
            const mvps = results?.mvps.map(p => players.find(pl => pl.id == p.id));
            const bedBreaks = results?.bedBreaks.map(p => players.find(pl => pl.id == p.id));
            return `\`•\` **Winners**: ${winners?.map(p => `${p.username}`).join(', ') || 'No winners'}
\`•\` **Losers**: ${losers?.map(p => `${p.username}`).join(', ') || 'No losers'}
\`•\`**MVP:** ${mvps?.map(p => `${p?.username}`).join(', ') || "No MVPs"}
\`•\`**Bed Breakers:** ${bedBreaks?.map(p => `${p?.username}`).join(', ') || "No bed breakers"}`
        }
        const oldStr = getGameString(game);
        game.scoreGame({
            winner: team1Win ? 'team1' : 'team2',
            mvps: mvps.map(m => ({ id: m.id })),
            bedBreaks: bedBreakers.map(b => ({ id: b.id }))
        }, true)
        const newStr = getGameString(game);
        game.close();
        return interaction.reply({
            embeds: [
                bot.createEmbed()
                    .setDescription(`**Game ${game.id}** has been force scored.`)
                    .addFields(([
                        { name: `Old`, value: oldStr },
                        { name: `New`, value: newStr }
                    ]))
            ]
        })

    }
}