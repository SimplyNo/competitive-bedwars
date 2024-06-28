import { ClientEvents } from "discord.js";
import { Bot } from "../../Bot";

export interface Event<K extends keyof ClientEvents> {
    name: K;
    once?: boolean;
    run(bot: Bot, ...args: ClientEvents[K]): Promise<void>
}