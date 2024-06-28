import express from 'express';
import InfoCommand from '../src/commands/info/info.command';
import LeaderboardCommand from '../src/commands/info/leaderboard.command';
import { VerifiedConfig } from '../src/types/config/VerifiedConfig';

import Redis from "ioredis";
import ScoreImage from '../src/core/games/ScoreImage';
export const redis = new Redis();
global.redis = redis;
// start expres server
const app = express();
const port = 3001;

app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
})


app.get('/', async (req, res) => {
    try {
        const [posx, posy, scale] = (req.query.pos as string).split(',').map(e => parseInt(e));
        global.posx = posx;
        global.posy = posy;
        global.scale = scale;
        console.log('generating...', posx, posy)
    } catch {
        global.posx = 0;
        global.posy = 0;
        global.scale = 0;
    }

    const data = await ScoreImage.generateScoreImage(123, 'team1', [
        { username: "USER", bed: true, mvp: true, newElo: 1520, oldElo: 1500, team: 'team1' },
        { username: "USER", bed: false, mvp: true, newElo: 1535, oldElo: 1500, team: 'team1' },
        { username: "USER", bed: true, mvp: true, newElo: 1520, oldElo: 1500, team: 'team1' },
        { username: "USER", bed: true, mvp: false, newElo: 1535, oldElo: 1500, team: 'team1' },
        { username: "USER", bed: true, mvp: true, newElo: 1000, oldElo: 1500, team: 'team2' },
        { username: "USER", bed: true, mvp: true, newElo: 1000, oldElo: 1500, team: 'team2' },
        { username: "USER", bed: true, mvp: true, newElo: 1000, oldElo: 1500, team: 'team2' },
        { username: "USER", bed: true, mvp: true, newElo: 1000, oldElo: 1500, team: 'team2' },
    ]);
    console.log('done.')
    // send a buffer as an image
    res.set('Content-Type', 'image/png');
    res.send(data);

})