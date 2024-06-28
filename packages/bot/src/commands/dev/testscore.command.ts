import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import ScoreImage from "../../core/games/ScoreImage";
export default class TestScoreCommand extends Command {
    constructor() {
        super({
            name: "testscore",
            description: "test score image",
            type: "dev",
            devOnly: true
        })
    }
    async run({ bot, args, message, serverConf, prefix, userConfig, verifiedConfig, flags }: CommandContext): Promise<void | Message<boolean>> {
        const data = await ScoreImage.generateScoreImage(123, 'team1', [
            { username: "USER", bed: true, mvp: true, newElo: 0, oldElo: 0, team: 'team1' },
            { username: "USER", bed: true, mvp: true, newElo: 0, oldElo: 0, team: 'team1' },
            { username: "USER", bed: true, mvp: true, newElo: 0, oldElo: 0, team: 'team1' },
            { username: "USER", bed: true, mvp: true, newElo: 0, oldElo: 0, team: 'team1' },
            { username: "USER", bed: true, mvp: true, newElo: 0, oldElo: 0, team: 'team2' },
            { username: "USER", bed: true, mvp: true, newElo: 0, oldElo: 0, team: 'team2' },
            { username: "USER", bed: true, mvp: true, newElo: 0, oldElo: 0, team: 'team2' },
            { username: "USER", bed: true, mvp: true, newElo: 0, oldElo: 0, team: 'team2' },
        ]);
        return message.reply({ files: [data] });
    }
}
