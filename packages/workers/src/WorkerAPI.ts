import express, { Request, Response } from 'express';
import { Util } from '../../bot/src/util/Util';
import config from "../../../config.json";
import { GuildChannelCreateOptions } from 'discord.js';
export interface BotToWorkerData {
    eval: {
        data: string
    },
    movemember: {
        memberID: string,
        channelID: string
    }
    createchannel: GuildChannelCreateOptions,
    deletechannel: {
        channelID: string
    }
}
export interface WorkerAPIRoute {
    type: 'get' | 'post',
    path: string,
    execute(req: Request, res: Response): Promise<void>
}
const app = express();
app.use(express.json());
export class WorkerAPI {
    constructor() {
        app.get('/', (req, res) => {
            res.send('OK');
        })

    }
    public async listen() {
        const files = Util.getAllFiles('src/routes');
        for (const file of files) {
            const route = (await import(`../${file}`))?.default as WorkerAPIRoute;
            if (!route?.execute) continue;
            app[route.type](route.path, (req, res) => route.execute(req, res));
        }
        const port = config.api.ports.workers;
        app.listen(port, () => {
            console.log(`Listening on port ${port}.`);
        });
    }
    // public async send<T extends keyof MinecraftToBotRoutes>(path: T, data: MinecraftToBotRoutes[T]) {
    //     console.log(`sending`, data)
    //     fetch(`http://localhost:${config.api.ports.bot}/${path}`, {
    //         method: "POST",
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify(data),
    //     })
    // }
}