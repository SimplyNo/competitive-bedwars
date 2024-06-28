import { Bot } from "../../Bot";
import { Util } from "../../util/Util";

export class Interval {
    interval: NodeJS.Timer;
    active: boolean = true;
    constructor(public name: string, public intervalMs: number) {
        console.log(`> Started interval "${name}" (${intervalMs})`);
    }
    async run(bot: Bot, ...args: any) {

    }
    async start(bot: Bot) {
        if (this.intervalMs < 0) {
            bot.log(`&6[Interval] Starting ${this.name} interval! [no start method]`);
        } else {
            bot.log(`&6[Interval] Starting ${this.name} interval!`);
            while (this.active) {
                await Util.wait(this.intervalMs);
                await this.run(bot);
            }
        }
    }
    stop() {
        clearInterval(this.interval as unknown as number);
    }
}