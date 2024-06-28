import { GuildMember, User } from "discord.js";
import { Bot } from "../../Bot";
import { ServerConfig } from "../../types/config/ServerConfig";
import { Ticket } from "./Ticket";

export class TicketManager {
    constructor(private bot: Bot, public serverConfig: ServerConfig) {

    }
    public getTicketByID(id: number): Ticket | null {
        const ticket = this.serverConfig.tickets.find(app => app.id == id);
        if (!ticket) return null;
        return new Ticket(this.bot, this.serverConfig, ticket);
    }
    public getTicketByChannel(channelId: string) {
        const ticket = this.serverConfig.tickets.find(ticket => ticket.channelId == channelId);
        if (!ticket) return null;
        return new Ticket(this.bot, this.serverConfig, ticket);
    }
    public createTicket(ticket: Ticket) {
        this.serverConfig.set({ tickets: [...this.serverConfig.tickets, ticket.toJSON()] })
    }
    public updateTicket(id: number, app: Partial<Ticket>) {
        const allApps = this.serverConfig.tickets;
        const index = allApps.findIndex(a => a.id == id);
        allApps[index] = { ...allApps[index], ...app };
        this.serverConfig.set({ tickets: allApps });
    }
    public getActiveTickets() {
        return this.serverConfig.tickets.filter(app => app.active);
    }
    public getPendingUserTickets(userID: string) {
        return this.serverConfig.tickets.filter(app => app.createdBy == userID && app.active);
    }
    public markAllApplicationsAsInactive() {
        const allApps = this.serverConfig.tickets;
        allApps.forEach(app => app.active = false);
        this.serverConfig.set({ tickets: allApps });
    }
    public clean() {
        // delete all inactive apps
        this.serverConfig.tickets.forEach(ticket => {
            if (!this.bot.channels.cache.get(ticket.channelId!)) {
                this.serverConfig.set({ tickets: this.serverConfig.tickets.filter(app => app.id !== ticket.id) });
            }
        });
    }
    public banUser(uuid: string, expire: number) {
        const bannedPlayers = this.serverConfig.ticketBannedPlayers || [];
        // check for duplicates
        let newBans = bannedPlayers.filter(e => e.uuid !== uuid).concat({ uuid: uuid, expire: Date.now() + expire });
        console.log(newBans)
        this.serverConfig.set({ ticketBannedPlayers: newBans });

    }
    public unbanUser(uuid: string) {
        const bannedPlayers = this.serverConfig.ticketBannedPlayers || [];
        const newBans = bannedPlayers.filter(e => e.uuid !== uuid);
        this.serverConfig.set({ ticketBannedPlayers: newBans });
    }

}