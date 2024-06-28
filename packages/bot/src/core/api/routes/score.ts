import { BotAPIRoute } from '../BotAPI';
export type PlayerResult = {
    kills: number,
    beds: number
}
export type APIScoreOptions = {
    success: true,
    force?: boolean,
    gameID: number,
    winningTeam: 'team1' | 'team2',
    results: Record<string, PlayerResult>
} | (
        ({ error: "players_not_found", foundPlayers: string[] } | { error: "game_not_found" })
        & { success: false, gameID: number, })
export default {
    type: 'post',
    path: '/score',
    async execute(bot, req, res) {
        const body = req.body as APIScoreOptions;
        const { gameID, success } = body;
        if (!gameID) return res.status(400).json({ error: 'Missing game id' });
        const game = bot.rankedManager.getGameByID(gameID);
        if (!game) return res.status(404).json({ error: 'Game not found' });
        if (!success) {
            game.update({ replayScoring: null });
            if (body.error === 'game_not_found') {
                bot.logger.log(game.textChannel, {
                    content: `${game._players.map(p => `<@${p}>`)}`, embeds: [
                        bot.createErrorEmbed()
                            .setTitle(`Failed To Score Game`)
                            .setDescription(`The provided replay does not exist.\n\nPlease use \`=score\` to rescore this game.`)]
                });
            }
            if (body.error === 'players_not_found') {
                const foundPlayers = body.foundPlayers.filter(p => game.players.find(v => v.getGameNickname() === p));
                const missingPlayers = game._players.length - foundPlayers.length;
                const playersInGame = game.players.map(p => ({ found: body.foundPlayers.includes(p.getGameNickname()), username: p.getGameNickname(), id: p.id }));
                if (missingPlayers / game._players.length > 0.5) return bot.logger.log(game.textChannel, {
                    content: `${game._players.map(p => `<@${p}>`)}`, embeds: [
                        bot.createEmbed()
                            .setTitle(`Invalid Replay`)
                            .setDescription(`Unable to match players in the replay to the players in the game.\n\nPlease use \`=score\` to rescore the game.`)
                    ]
                })
                await bot.logger.log(game.textChannel, {
                    content: `${game._players.map(p => `<@${p}>`).join(' ')}`,
                    embeds: [
                        bot.createErrorEmbed()
                            .setTitle(`Failed To Score Game`)
                            .setDescription(`**${missingPlayers}** player(s) was not found in the replay.\n\nIf a player is **nicked** or on an **alt** they **__MUST__** use \`=nick\` to link the username with their account.`)
                            .addFields([{
                                name: `Players Found [${game._players.length - missingPlayers}/${game._players.length}]`,
                                value: `${playersInGame.sort((a, b) => Number(b.found) - Number(a.found)).map(p => `${p.found ? '✅' : '❌'} <@${p.id}>`).join('\n')}`
                            }])
                    ]
                });
                playersInGame.filter(p => !p.found).forEach(player => {
                    bot.logger.log(game.textChannel, { content: `<@${player.id}>`, embeds: [bot.createErrorEmbed().setDescription(`You must \`=nick\` as the username you are playing as in the game, not doing so may result in strikes applied to your account.`)] })
                })

            }
            return;
        }
        const { results, winningTeam } = body;
        if (game.results && !body.force) {
            bot.logger.log(game.textChannel, { embeds: [bot.createErrorEmbed().setDescription(`Failed to auto score game: this game has already been scored.`)] })
            return res.status(400).json({ error: 'Game already scored' });
        }
        const verifiedPlayers = Object.entries(results).map(([username, stats]) => ({ verified: bot.getVerifiedUser({ username: username }) || bot.getVerifiedUser({ nickname: username }), username, stats }));
        if (verifiedPlayers.some(p => !p.verified)) {
            const missingPlayers = verifiedPlayers.filter(p => !p.verified).map(p => p.verified?.getGameNickname());
            bot.logger.log(game.textChannel, { embeds: [bot.createErrorEmbed().setDescription(`Failed to auto score game, these players in the replay were not accounted for: ${missingPlayers.map(p => `\`${p}\``).join(', ')}`)] })
            game.update({ replayScoring: null });
            return res.status(400).json({ error: 'One or more players not found' });
        }
        const bedBreaks = verifiedPlayers.filter(({ stats }) => stats.beds > 0).map(({ verified }) => ({ id: verified!.id }));

        const killsLb = verifiedPlayers.sort((a, b) => b.stats.kills - a.stats.kills);
        const topKills = killsLb[0].stats.kills;
        const mvps = killsLb.filter(({ stats }) => stats.kills === topKills).map(({ verified }) => ({ id: verified!.id }));
        game.scoreGame({
            winner: winningTeam,
            bedBreaks,
            mvps
        })
        game.close({ force: true });

        // bot.logger.log(game.textChannel, {
        //     embeds: [
        //         bot.createEmbed()
        //             .setTitle(`Game #${game.id} successfully scored!`)
        //             .setDescription(`**Winning Team**: ${game.getTeamPlayers(winningTeam).map(p => `<@${p.id}>`).join(', ')}`
        //     ]
        // })
        res.json({ success: true });
    }
} as BotAPIRoute;