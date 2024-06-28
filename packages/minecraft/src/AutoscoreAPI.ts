import express, { Request, Response } from 'express';
import { Util } from '../../bot/src/util/Util';
import config from "../../../config.json";
import { MinecraftToBotRoutes } from '../../bot/src/core/api/BotAPI';
export interface BotToAutoScorerData {
    eval: {
        data: string
    },
    processgame: {
        gameID: number,
        force?: boolean,
        replayID: string,
        team1: { username: string, uuid: string }[],
        team2: { username: string, uuid: string }[]
    }
}
export interface MinecraftAPIRoute {
    type: 'get' | 'post',
    path: string,
    execute(req: Request, res: Response): Promise<void>
}
const app = express();
app.use(express.json());
export class AutoScorerAPI {
    constructor() {
        app.get('/', (req, res) => {
            res.send('OK');
        })

    }
    public async listen() {
        const files = Util.getAllFiles('src/routes');
        for (const file of files) {
            const route = (await import(`../${file}`))?.default as MinecraftAPIRoute;
            if (!route?.execute) continue;
            app[route.type](route.path, (req, res) => route.execute(req, res));
        }
        const port = config.api.ports.minecraft;
        app.listen(port, () => {
            console.log(`Listening on port ${port}.`);
        });
    }
    public async send<T extends keyof MinecraftToBotRoutes>(path: T, data: MinecraftToBotRoutes[T]) {
        console.log(`sending`, data)
        fetch(`http://localhost:${config.api.ports.bot}/${path}`, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
    }
}