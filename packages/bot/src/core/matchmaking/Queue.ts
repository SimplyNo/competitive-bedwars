import { TextChannel, VoiceChannel } from "discord.js";
import { Bot } from "../../Bot";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
// different from parties!!!!!!!!!!!!!!!!!!!!
export type queueGroup = {
    leader: VerifiedConfig,
    players: VerifiedConfig[],
    highestElo: number
}
export class Queue {
    private queue: VerifiedConfig[] = [];
    private log: (msg: string) => void;
    constructor(private bot: Bot) {
        this.log = bot.initLogger(`Queue`);
    }
    public getQueue() {
        return this.queue;
    }
    public add(player: VerifiedConfig) {
        if (this.queue.some(p => p.uuid === player.uuid)) return;
        this.queue = this.queue.filter(p => p.uuid !== player.uuid).concat(player);
        this.log(`&aAdded ${player.username} to the queue (now ${this.queue.length})`);

    }
    public remove(player: VerifiedConfig) {
        if (!this.queue.some(p => p.uuid === player.uuid)) return;
        this.queue = this.queue.filter(p => p.uuid !== player.uuid);
        // Util.printStackTrace()
        this.log(`&cRemoved ${player.username} from the queue (now ${this.queue.length})`);


    }
    public getPlayer(obj: { id?: any; username?: any; uuid?: any; }): (VerifiedConfig & { uuid: string }) | undefined {
        const player = this.queue.find(p => p.id === obj.id || p.username === obj.username || p.uuid === obj.uuid);
        if (player) return player as (VerifiedConfig & { uuid: string });
    }
    private getQueueGroup(player: VerifiedConfig): queueGroup {
        const party = player.getUser().getParty();
        const players = party?.members || [player];
        const highestElo = players.sort((a, b) => b.rbw.elo - a.rbw.elo)[0].rbw.elo;
        return {
            leader: party?.leader || player,
            players,
            highestElo
        }
    }
    public getQueueGroups(): queueGroup[] {
        // const test = [
        //     ["21O_o", 400],
        //     ["simplyno", 300],
        //     ["simplyyes", 600],
        //     ["simplymaybe", 300],
        //     ["chirp", 700],
        //     ["hashim", 700],
        //     ["jacqb", 700],
        //     ["vaxela", 700],
        //     ["nytino", 500],
        //     ["asshole", 600],
        //     ["12lion", 100],
        //     ["a3lettername", 100],
        //     ["big_bread_daddy", 100],
        //     ["bot", 100],
        //     ["aestheticallysad", 100],
        //     ["caponier", 50],
        //     ["cocoq", 0]
        // ]
        // const groups: queueGroup[] = test.map(e => ({ leader: this.bot.getVerifiedUser({ username: e[0] })!, players: [this.bot.getVerifiedUser({ username: e[0] })!], highestElo: e[1] as number }))
        // return groups;
        let groups: queueGroup[] = [];
        for (const player of this.getQueue()) {
            const party = player.getUser().getParty();
            if (!party || (party!.leader.id === player.id && party?.members.every(m => this.bot.matchMaking.isInQueue(m)))) {
                groups.push(this.getQueueGroup(player));
            }
        }
        // console.log(`getQueueGroups(): `, groups)
        return groups;
    }
    public fetchPlayers(size: number, force: boolean = false) {
        if (!force && this.queue.length < size) return;
        const players: VerifiedConfig[] = [];
        for (let i = 0; i < size; i++) {
            const randomIndex = Math.floor(Math.random() * this.queue.length);
            const player = this.queue.splice(randomIndex, 1)[0];
            // console.log('p', player);
            players.push(player);
        }
        return players;
    }
}