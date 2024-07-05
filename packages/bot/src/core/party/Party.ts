import { VoiceBasedChannel, VoiceChannel } from "discord.js";
import { Bot } from "../../Bot";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
import { parties } from "./PartyManager";

export type PartyConfig = {
    leader: string;
    members: string[];
    created: number;
    autowarp: boolean;
    inactiveSince: number | null;
}
export class Party {
    public members: VerifiedConfig[] = [];
    public leader: VerifiedConfig;
    public invites: Set<string> = new Set();
    public inactiveSince: number | null = null;
    public created: number;
    public autowarp: boolean;
    constructor(private bot: Bot, partyConfig: PartyConfig) {
        this.leader = bot.getVerifiedUser({ id: partyConfig.leader })!;
        this.members = partyConfig.members.map(m => bot.getVerifiedUser({ id: m })!);
        this.created = partyConfig.created;
        this.autowarp = partyConfig.autowarp;
        this.inactiveSince = partyConfig.inactiveSince;
        bot.log(`&e[PARTY] Party with leader ${this.leader?.username} instanced.`)
    }
    public toJSON(): PartyConfig {
        return {
            created: this.created,
            leader: this.leader.id,
            members: this.members.map(m => m.id),
            autowarp: this.autowarp,
            inactiveSince: null
        }
    }
    public exists() {
        return parties.has(this.created.toString());
    }
    public _update() {
        parties.set(this.created.toString(), this.toJSON());
    }
    public async warp(userID: string, channel: VoiceBasedChannel) {
        // console.log(`resolving members!`)
        const members = await this.resolveAllMembers();
        // console.log(`resolved members!`)
        for (const member of members) {
            if (!member || member.id === userID) continue;
            // if (member.voice.channel) member.voice.setChannel(channel);
            if (member.voice.channel) this.bot.api.workers.moveMember(member.id, channel.id);
        }

    }
    public resolveAllMembers() {
        return Promise.all(this.members.map(m => m.getUser().resolveMember()))
    }
    public calculateAverageElo() {
        return this.members.reduce((acc, cur) => acc + cur.rbw.elo, 0) / this.members.length;
    }
    public setInactivity(timeSinceOn: number | null) {
        this.inactiveSince = timeSinceOn;
        this._update();
    }
    public invite(memberID: string) {
        this.invites.add(memberID);
    }
    public removeInvite(memberID: string) {
        this.invites.delete(memberID);
    }
    public disband() {
        this.members.forEach(m => {
            if (m.id === this.leader.id) return;
            this.removeMember(m);
        })
        this.bot.partyManager.deleteParty(this.created);
    }
    public setAutowarp(value: boolean) {
        this.autowarp = value;
        this._update();
    }
    public addMember(member: VerifiedConfig) {
        this.bot.matchMaking.remove(member);
        this.members.push(member);
        this._update();
        this.leader.getUser().resolveMember().then(async (leader) => {
            const discordMember = await member.getUser().resolveMember();
            if (!leader || !discordMember) return;
            const partyChannel = this.bot.getMainServerConfig().partyChannels[this.leader.id];
            if (partyChannel) {
                console.log(`party channel detected. leader is in voice channel:`, leader.voice.channel && leader.voice.channel.id === partyChannel.id)
                if (leader.voice.channel && leader.voice.channel.id === partyChannel.id) {
                    // discordMember.voice.channel && await discordMember.voice.setChannel(leader.voice.channel).catch(e => console.error(`ERROR WHILST TRYING TO SET MEMBER TO Q CHANNEL!`, e));
                    discordMember.voice.channel && await this.bot.api.workers.moveMember(discordMember.id, leader.voice.channel.id).catch(e => console.error(`ERROR WHILST TRYING TO SET MEMBER TO Q CHANNEL!`, e));
                }
                if (discordMember.voice.channel?.id === partyChannel.id) {
                    this.bot.matchMaking.add(member);
                }
                const pChannel = await this.bot.parseChannel(partyChannel.id, this.bot.getMainGuild()!) as VoiceChannel;
                if (pChannel) {
                    pChannel.edit({
                        permissionOverwrites: [
                            ...pChannel.permissionOverwrites.cache.values(),
                            {
                                id: member.id,
                                allow: ['Speak', 'Connect', 'ViewChannel', 'SendMessages']
                            }
                        ]
                    })
                }
            }
            const waitingRoom = await this.bot.parseChannel(this.bot.config.channels.waitingRoom, this.bot.getMainGuild()!) as VoiceChannel;
            if (leader.voice.channel && leader.voice.channel.id === waitingRoom.id) {
                // discordMember.voice.channel && discordMember.voice.setChannel(leader.voice.channel);
                discordMember.voice.channel && this.bot.api.workers.moveMember(discordMember.id, leader.voice.channel.id);
            }
            const oldMemberQueueChannel = await this.bot.parseChannel(this.bot.getMainServerConfig().partyChannels[discordMember.id]?.id, this.bot.getMainGuild()!) as VoiceChannel;
            if (oldMemberQueueChannel) {
                console.log('im deleting oldmemberqueuechannel', oldMemberQueueChannel.name)
                this.bot.api.workers.deleteChannel(oldMemberQueueChannel.id);
            }
        })
    }
    public restartQueue() {
        // remove all members from queue and readd:
        this.members.filter(m => this.bot.matchMaking.isInQueue(m)).forEach(m => {
            this.bot.matchMaking.remove(m);
            this.bot.matchMaking.add(m);
        })
    }
    public removeMember(member: VerifiedConfig) {
        console.log(`removing ${member.username} from party`)
        this.members = this.members.filter(m => m.id !== member.id);
        this.bot.matchMaking.remove(member);
        this._update();
        this.restartQueue();

        this.bot.matchMaking.getQueueChannel(this.leader, false).then(async channel => {
            if (!channel) return;
            channel.edit({
                permissionOverwrites: [
                    ...channel.permissionOverwrites.cache.values(),
                    {
                        id: member.id,
                        deny: ['Speak', 'Connect', 'ViewChannel', 'SendMessages']
                    }
                ]
            }).catch(e => console.error(`error whilst remvoing party member,`, e, `perm overwrites:`, [
                ...channel.permissionOverwrites.cache.values(),
                {
                    id: member.id,
                    deny: ['Speak', 'Connect', 'ViewChannel', 'SendMessages']
                }
            ]))
            const discordMember = await member.getUser().resolveMember();
            if (discordMember && discordMember.voice.channel?.id === channel.id) {
                discordMember.voice.disconnect();
            }
        })
    }
    public setLeader(member: VerifiedConfig) {
        let partyChannels = this.bot.getMainServerConfig().partyChannels;
        partyChannels[member.id] = partyChannels[this.leader.id];
        delete partyChannels[this.leader.id];
        this.bot.getMainServerConfig().set({ partyChannels });
        this.leader = member;
        this._update();
    }
    public isFull() {
        return this.members.length >= 2;
    }
    public isEmpty() {
        return this.members.length === 0;
    }
    public getMember(id: string) {
        return this.members.find(m => m.id === id);
    }
}