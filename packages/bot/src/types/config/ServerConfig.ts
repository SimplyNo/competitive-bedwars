import { Collection } from "discord.js";
import { Bot, serverConfig } from "../../Bot";
import { RawTicket } from "../../core/tickets/Ticket";
import { TicketManager } from "../../core/tickets/TicketManager";
const memberUpdateCache = new Collection<string, { expire: number }>();
export type NonFunctionProperties<T> = {
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T];

export type RawServerConfig = Pick<ServerConfig, Exclude<NonFunctionProperties<ServerConfig>, undefined | 'bot'>>;

export class ServerConfig {
    readonly id: string;
    ticketBannedPlayers: { expire: number, uuid: string }[] = [];
    tickets: RawTicket[] = [];
    ticketMessage?: { channelID: string, messageID: string };
    jailMessage?: { channelID: string, messageID: string };
    queueMessage?: { channelID: string, messageID: string };
    autoScoreStatusMessage?: { channelID: string, messageID: string };
    partyChannels: { [key: string]: { id: string, startTime: number | null, messageID: string | null } } = {};
    queueStatus: 'closed' | 'open' = 'open';
    constructor(private bot: Bot, options: Partial<ServerConfig>) {
        Object.assign(this, options);
    }
    public toJSON(): RawServerConfig {
        const excludeKeys = ['bot', 'matchMaking']; // add keys to exclude here

        return <RawServerConfig>Object.entries(this)
            .filter(([key, value]) => typeof value !== 'function' && !excludeKeys.includes(key) && value !== undefined)
            .reduce((obj, [key, value]) => {
                obj[key] = value;
                return obj;
            }, {});
    }
    public isQueueOpen() {
        return this.queueStatus === 'open';
    }
    public isPartyChannel(channelID: string) {
        return Object.values(this.partyChannels).some(c => c?.id === channelID);
    }
    public ticketManager() {
        return new TicketManager(this.bot, this)
    }
    public set(options: Partial<RawServerConfig>) {
        // console.log(`setting server config`)
        // printStackTrace();
        Object.assign(this, options);
        serverConfig.set(this.id, this.toJSON());

    }
}