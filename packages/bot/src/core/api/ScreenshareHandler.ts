import fetch from "node-fetch";
import { Bot } from "../../Bot";
import { APIMessage, MessageCreateOptions } from "discord.js";

export class ScreenshareHandler {
    constructor(private bot: Bot) {

    }
    public async send(path: 'send', data: { user: string, message: MessageCreateOptions }) {
        console.log(`POST DATA TO SCREENSHARE:`, data);
        const res = await fetch(`http://localhost:${this.bot.config.api.ports.screensharing}/${path}`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(data),
        }).then(res => res.json()).catch(e => null);
        return res;
    }
    public async get(path: string) {
        const res = await fetch(`http://localhost:${this.bot.config.api.ports.screensharing}/${path}`, {
            method: "GET",
            headers: { 'Content-Type': 'application/json', },
        }).then(res => res.json()).catch(e => null);
        return res;
    }
}