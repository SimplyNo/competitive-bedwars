import fetch from "node-fetch";
import { Bot } from "../../Bot";
import { BotToAutoScorerData } from "../../../../minecraft/src/AutoscoreAPI";

export class AutoScoreHandler {
    constructor(private bot: Bot) {

    }
    public async send<T extends keyof BotToAutoScorerData>(path: T, data: BotToAutoScorerData[T]) {
        console.log(`POST DATA TO MINECRAFT:`, data);
        const res = await fetch(`http://localhost:${this.bot.config.api.ports.minecraft}/${path}`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(data),
        }).then(res => res.json()).catch(e => null);
        return res;
    }
    public async get(path: string) {
        const res = await fetch(`http://localhost:${this.bot.config.api.ports.minecraft}/${path}`, {
            method: "GET",
            headers: { 'Content-Type': 'application/json', },
        }).then(res => res.json()).catch(e => null);
        return res;
    }
}