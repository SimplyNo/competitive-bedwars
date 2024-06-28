import Enmap from "enmap";
import { Bot } from "../../Bot";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
import { Party, PartyConfig } from "./Party";
import { Collection } from "discord.js";

export const parties = new Enmap<string, PartyConfig>({
    name: 'parties'
});
export class PartyManager {
    private partyInstances: Collection<string, Party> = new Collection();
    constructor(private bot: Bot) {
    }
    public _deleteAllParties() {
        parties.clear();
    }
    public deleteParty(id: number) {
        parties.delete(id.toString());
        this.partyInstances.delete(id.toString());
    }
    private getParty(id: number) {
        const instanced = this.partyInstances.get(id.toString());
        if (!instanced && parties.has(id.toString())) this.partyInstances.set(id.toString(), new Party(this.bot, parties.get(id.toString())!));
        return this.partyInstances.get(id.toString());
    }

    public getAllParties() {
        // console.log(parties)
        return parties.map(p => this.getParty(p.created)!);
    }
    public createParty(leader: VerifiedConfig) {
        console.log(`CREATINGA NEW PARTY, LEADER: `, leader.id)
        const newParty = new Party(this.bot, { leader: leader.id, members: [leader.id], created: Date.now(), autowarp: false, inactiveSince: null });
        this.partyInstances.set(newParty.created.toString(), newParty);
        newParty._update();
        return newParty;
    }
    public getPartyByInvite(memberID: string) {
        return [...this.partyInstances.filter(p => p.invites.has(memberID)).values()];
    }
    public getPartyByMember(memberID: string) {
        const party = parties.find(p => p.members.includes(memberID));
        if (party) return this.getParty(party.created);
    }
    public getPartyByLeader(leaderID: string) {
        const party = parties.find(p => p.leader === leaderID);
        if (party) return this.getParty(party.created);
    }

}