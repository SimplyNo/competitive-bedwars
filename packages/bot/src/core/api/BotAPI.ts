import express, { Request, Response } from "express";
import { Bot } from "../../Bot";
import { Util } from "../../util/Util";
import fetch from "node-fetch";
import { AutoScoreHandler } from "./AutoScoreHandler";
import { APIEvalOptions } from "./routes/eval";
import { APILogOptions } from "./routes/log";
import { APIStatusOptions } from "./routes/status";
import { APIScoreOptions } from "./routes/score";
import { ScreenshareHandler } from "./ScreenshareHandler";
import WorkerHandler from "./WorkerHandler";
export interface BotAPIRoute {
    type: 'get' | 'post',
    path: string,
    execute(bot: Bot, req: Request, res: Response): Promise<void>
}
export interface MinecraftToBotRoutes {
    eval: APIEvalOptions,
    log: APILogOptions,
    status: APIStatusOptions,
    score: APIScoreOptions
}
const app = express();
app.use(express.json());
export class BotAPI {
    log: ReturnType<Bot['initLogger']>;
    autoscore: AutoScoreHandler;
    screenshare: ScreenshareHandler;
    workers: WorkerHandler;
    constructor(private bot: Bot) {
        this.log = bot.initLogger('API');
        this.autoscore = new AutoScoreHandler(bot);
        this.screenshare = new ScreenshareHandler(bot);
        this.workers = new WorkerHandler(bot);
        app.get('/', (req, res) => {
            res.send('OK');
        })
    }
    async listen() {
        const files = Util.getAllFiles('src/core/api/routes');
        for (const file of files) {
            const route = (await import(`../../../${file}`))?.default as BotAPIRoute;
            if (!route?.execute) continue;
            // this.log(route.path);
            app[route.type](route.path, (req, res) => route.execute(this.bot, req, res));
        }
        const port = this.bot.config.api.ports.bot;
        app.listen(port, () => {
            this.log(`Listening on port ${port}.`);
        });
    }
}