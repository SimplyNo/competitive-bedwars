import { ChannelType, Collection, Message, MessageEditOptions, PermissionFlagsBits, VoiceChannel } from "discord.js";
import { Bot, verifiedUsers } from "../../Bot";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
import { Util } from "../../util/Util";
import { Party } from "../party/Party";
import { Queue, queueGroup } from "./Queue";
const playersPerGame = 4;
const countdownDuration = 10000;

export class MatchMaker {
    private log: (msg: string) => void;
    private queue: Queue;
    private matchStartDelay: Collection<string, number> = new Collection();
    private channelCreationPromises: Collection<string, Promise<VoiceChannel | undefined>> = new Collection();
    private messageEditQueueTimes: Collection<string, number> = new Collection();
    public groupsInQueue: Collection<string, queueGroup & { queueStart: number }> = new Collection();
    constructor(private bot: Bot) {
        this.log = bot.initLogger('Match Making');
        this.queue = new Queue(bot);
        // this.groupsInQueue.set('a', {
        //     leader: bot.getVerifiedUser({ username: 'simplyno' })!,
        //     highestElo: 0,
        //     players: [
        //         bot.getVerifiedUser({ username: 'simplyno' })!,
        //     ],
        //     queueStart: Date.now()
        // })
        // this.groupsInQueue.set('c', {
        //     leader: bot.getVerifiedUser({ username: 'aestheticallysad' })!,
        //     highestElo: 0,
        //     players: [
        //         bot.getVerifiedUser({ username: 'aestheticallysad' })!,
        //     ],
        //     queueStart: Date.now()
        // });
        // this.groupsInQueue.set('e', {
        //     leader: bot.getVerifiedUser({ username: 'u9d' })!,
        //     highestElo: 0,
        //     players: [
        //         bot.getVerifiedUser({ username: 'u9d' })!,
        //     ],
        //     queueStart: Date.now()
        // })
        // this.groupsInQueue.set('d', {
        //     leader: bot.getVerifiedUser({ username: 'stseid' })!,
        //     highestElo: 0,
        //     players: [
        //         bot.getVerifiedUser({ username: 'stseid' })!,
        //     ],
        //     queueStart: Date.now()
        // })

    }
    private isValidMatch(parties: queueGroup[], maxPlayersPerTeam: number): boolean {
        const totalPlayers = parties.reduce((sum, party) => sum + party.players.length, 0);
        if (totalPlayers > maxPlayersPerTeam * 2) return false;

        let team1 = 0;
        let team2 = 0;

        for (const party of parties) {
            if (team1 <= team2 && team1 + party.players.length <= maxPlayersPerTeam) {
                team1 += party.players.length;
            } else if (team2 + party.players.length <= maxPlayersPerTeam) {
                team2 += party.players.length;
            } else {
                return false;
            }
        }
        return true;
    }
    async forceUpdateQueues() {
        const partyChannels = this.bot.getMainServerConfig().partyChannels;
        console.log(`partychannels:`, partyChannels)

        const usersWithJoin = this.bot.getAllVerifiedUsers().filter(u => u?.queueJoin);
        Object.entries(partyChannels).forEach(async ([leaderID, data]) => {
            if (!data) {
                delete partyChannels[leaderID];
                return this.bot.getMainServerConfig().set({ partyChannels });
            }
            const channel = await this.bot.parseChannel(data.id, this.bot.getMainGuild()!) as VoiceChannel;
            const party = this.bot.partyManager.getPartyByMember(leaderID);
            if (!channel) return;
            const members = party?.members || [this.bot.getVerifiedUser({ id: leaderID })!];
            members.forEach(m => {
                if (channel.members.has(m.id)) this.add(m);
            })
        })
        usersWithJoin.forEach(u => {
            const party = u.getUser().getParty();
            const members = party?.members || [u];
            members.forEach(async m => {
                const member = await m.getUser().resolveMember();
                if (member?.voice.channel) this.add(m);
            })

        })
    }
    async queueMessageEdit(message: Message, options: MessageEditOptions) {
        if (this.messageEditQueueTimes.get(message.id)! > 2) return console.log(`throwing out a message edit`);
        this.messageEditQueueTimes.set(message.id, (this.messageEditQueueTimes.get(message.id) || 0) + 1);
        setTimeout(() => this.messageEditQueueTimes.set(message.id, (this.messageEditQueueTimes.get(message.id) || 0) - 1), 1000);

        // this.bot.log(`&bupdating qstatus msg`)
        return message.edit(options)
            // .then(() => this.bot.log(`&bqstatus msg updated`))
            .catch(e => null);
    }
    getAllInQueue() {
        return this.queue.getQueue();
    }
    async getQueueChannel(player: VerifiedConfig, createIfDoesntExist = true): Promise<VoiceChannel | undefined> {
        const party = player.getUser().getParty();
        const leader = party?.leader || player;
        const [_, existingPartyChannel] = Object.entries(this.bot.getMainServerConfig().partyChannels).find(([userID, channel]) => userID === leader.id) || [];
        const existingPromise = await this.channelCreationPromises.get(leader.id);
        const existingChannel = existingPromise ? await existingPromise : <VoiceChannel>await this.bot.parseChannel(existingPartyChannel?.id, this.bot.getMainGuild()!);
        if (!existingChannel && createIfDoesntExist) {
            console.log(`[QUEUES] Existing channel (${existingPartyChannel}) (${_}) not found, creating a new one`);
            const overwrites = [
                {
                    id: leader.id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel]
                },
                ...(party?.members.map(m => m.id).map(id => ({
                    id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel]
                })) as [] || []),
                {
                    id: this.bot.getMainGuild()?.roles.everyone.id!,
                    deny: [PermissionFlagsBits.Connect]
                }
            ];
            // create new party channel
            console.log(`Attempting to create new party channel... watch out for crash here!`, overwrites)
            const newPromise = this.bot.api.workers.createChannel({
                name: `Queueing...`,
                // name: `(${leader.username})`,
                type: ChannelType.GuildVoice,
                parent: this.bot.config.channels.partyCategory,
                permissionOverwrites: overwrites
            }).catch(e => { console.error(`heres the crsah!`, e); return undefined; });
            this.channelCreationPromises.set(leader.id, newPromise);
            const channel = await newPromise;
            this.channelCreationPromises.delete(leader.id);
            if (!channel) return this.bot.log(`&e[QUEUES] Could not create channel for ${leader.username}`);
            let partyChannels = this.bot.getMainServerConfig().partyChannels;
            partyChannels[leader.id] = { id: channel.id, startTime: null, messageID: null };
            this.bot.getMainServerConfig().set({ partyChannels });
            return channel;
        } else {
            // move to existing party channel
            if (!existingChannel) return;// this.bot.log(`&e[QUEUES] Could not find channel ${existingPartyChannel}`);
            return existingChannel;
        }
    }
    isInQueue(player: VerifiedConfig) {
        return this.queue.getQueue().some(p => p.id === player.id);
    }
    private getGroupsInRange(minElo: number, maxElo: number) {
        const groups = [...this.groupsInQueue.values()].filter(g => g.highestElo >= minElo && g.highestElo <= maxElo);
        return groups.filter(g => g.highestElo >= minElo && g.highestElo <= maxElo);
    }
    async updateQueueMessage(player: VerifiedConfig) {
        const party = player.getUser().getParty();
        const { partyChannels } = this.bot.getMainServerConfig();
        const leader = party?.leader || player;
        const [_, existingPartyChannel] = Object.entries(this.bot.getMainServerConfig().partyChannels).find(([userID, channel]) => userID === leader.id) || [];

        const channel = await this.bot.parseChannel(existingPartyChannel?.id, this.bot.getMainGuild()!) as VoiceChannel;
        const partyChannel = partyChannels[leader.id];
        const queueGroup = this.groupsInQueue.get(leader.id);

        if (!partyChannel) return console.log(`[QUEUES] No party channel/queue group found for ${leader.username}`);
        if (this.bot.messageEditRateLimits.get(partyChannel.id!)! > Date.now()) return;// console.log('RATE LIMIT DETECTED, NOT EDITING MESSAGE!!! WOOOO');

        const removeLeaderChannel = () => {
            let channels = this.bot.getMainServerConfig().partyChannels;
            delete channels[leader.id];
            this.bot.getMainServerConfig().set({ partyChannels: channels });
        }
        if (!channel) {
            removeLeaderChannel();
        } else if (channel) {
            const message = partyChannel.messageID ? await channel.messages.fetch(partyChannel.messageID).catch(e => console.error(`error whilst getting party message: ${e}`)) : null;
            const connectedMembers = channel.members.filter(m => party ? party?.members.some(p => p.id === m.id) : m.id === player.id);

            const membersInQueue = party ? this.getAllInQueue().filter(e => party.members.find(m => m.id == e.id)) : this.getAllInQueue().filter(e => e.id === player.id);
            // const isPartyFullyConnected = connectedMembers.size === (party?.members.length || 1);
            const isPartyFullyConnected = membersInQueue.length === (party?.members.length || 1);
            const options = ({
                content: `<@${leader.id}>`,
                embeds: [
                    this.bot.createEmbed()
                        .setDescription(`${isPartyFullyConnected ? `**Elapsed Time**: \`${Util.formatDuration(Date.now() - (queueGroup?.queueStart || 0))}\`\n` : ''}**Status**: \`${isPartyFullyConnected ? 'Active' : 'Waiting'}\`${queueGroup ? `\n**Current Search Range**: \`${queueGroup.highestElo >= 1200 ? '1200+' : this.getEloRange(queueGroup!).join('-')}\`` : ''}
**Connected**: \`${membersInQueue.length}/${party?.members.length || 1}\`
${party ? party.members.map(m => `<@${m.id}> ${!connectedMembers.has(m.id) ? !this.isInQueue(m) ? 'NOT CONNECTED' : `Connected with \`=j\`` : ''}`).join('\n') : connectedMembers.map(m => `<@${m.id}>`).join('\n')}`)
                ]
            })
            try {
                // this.bot.log(`we're inside try zone for`, party?.leader.id)
                if (!message) {
                    console.log(`Sending Message because no message:`, message)
                    const msg = await channel.send(options)
                    partyChannels[leader.id].messageID = msg.id;
                } else {
                    if (options.embeds[0].data.description !== message.embeds[0].description) this.queueMessageEdit(message, options);
                    // if (options.embeds[0].data.description !== message.embeds[0].description) console.log(options.embeds[0].data.description, '\n---\n', message.embeds[0].description)
                }
                // const isInQueue = this.isInQueue(leader);
                const isInQueue = isPartyFullyConnected;
                partyChannel.startTime = isInQueue && !partyChannel.startTime ? Date.now() : isInQueue ? partyChannel.startTime : null;
                // console.log(`setting start time: `, partyChannel.startTime)
                this.bot.getMainServerConfig().set({ partyChannels: { ...this.bot.getMainServerConfig().partyChannels, [leader.id]: partyChannel } });
                // console.log(`set!! NEW CONFIG:`, this.bot.getMainServerConfig().partyChannels[leader.id])
            } catch (e) {
                removeLeaderChannel();
            }
        }

    }
    async add(player: VerifiedConfig) {
        if (!this.bot.getMainServerConfig().isQueueOpen()) return;
        // console.log(`Adding to queue:`, player.username)
        if ((await player.getUser().isFrozen())) return console.error(`${player.username} tried to queue, but is frozen.`);
        if ((await player.getUser().isRankBanned())) return console.error(`${player.username} tried to queue, but is rank banned.`);
        this.queue.add(player);

        this.refreshQueueGroup(player);
        // this.updateQueueMessage(player);
        this.checkForMatch();
    }
    getEloRange(group: queueGroup & { queueStart: number }): [number, number] {
        if (group.highestElo >= 1200) {
            return [1000, 10000];
        }
        const diff = Date.now() - group.queueStart;
        // increase elo range by 100 every 2.5 minutes to cap of 500:

        const eloRange = Math.min(Math.floor(diff / 60000) * 40 + 300, 500);
        // const eloRange = Math.floor(diff / 1000) * 25 + 150;
        return [Math.max(group.highestElo - eloRange, 0), group.highestElo + eloRange]
    }
    async checkForMatch() {
        if (!this.bot.getMainServerConfig().isQueueOpen()) return;
        let games: queueGroup[][] = [];
        const allGroups = [...this.groupsInQueue.values()];

        // console.log(`------------------ start --------------------`)
        for (const group of allGroups) {

            const [minElo, maxElo] = this.getEloRange(group);
            const groupsInRange = this.getGroupsInRange(minElo, maxElo).filter(g => this.getGroupsInRange(...this.getEloRange(g)).find(e => e.leader.id === group.leader.id));
            console.log(`GROUPS FOUND (${groupsInRange.length}): (${minElo}-${maxElo})`, groupsInRange.map(p => `${p.leader.username} group (${p.players.length}): ${p.highestElo} | ${JSON.stringify(p.leader.ranked().getRankFromElo(p.highestElo))}`));
            if (groupsInRange.map(e => e.players).flat().length >= playersPerGame) {

                let tempGroups: queueGroup[] = [];
                Util.shuffle(groupsInRange).forEach(g => {
                    const currentSize = tempGroups.map(e => e.players).flat().length;
                    const gSize = g.players.length;
                    if (currentSize + gSize <= playersPerGame && this.isValidMatch([...tempGroups, g], playersPerGame / 2)) {
                        tempGroups.push(g);
                    }
                })
                if (tempGroups.map(e => e.players).flat().length >= playersPerGame) {
                    const matchDelay = this.matchStartDelay.get(`${group.leader.id}`);
                    games.push(tempGroups);
                    // if (matchDelay && matchDelay <= Date.now()) {
                    // } else if (!matchDelay) {
                    //     this.matchStartDelay.set(`${group.leader.id}`, Date.now() + countdownDuration);
                    //     setTimeout(() => {
                    //         this.matchStartDelay.delete(`${group.leader.id}`);
                    //         this.checkForMatch();
                    //     }, countdownDuration);
                    // }
                }
            }
        }
        if (games[0]) {
            this.startMatch(Util.shuffle(games)[0])
        }
        // console.log(`------------------ end --------------------`)

        // queueing_ranges.forEach(([min, max]) => {
        //     const groups = this.getGroupsInRange(min, max, 300);
        //     // console.log(`GROUPS FOUND: (${min}-${max})`, groups.map(p => p.players.map(p => `${p.username} ${p.rbw.elo}`)));
        //     console.log(`GROUPS FOUND (${groups.length}): (${min}-${max})`, groups.map(p => `${p.leader.username} group: ${p.highestElo} | ${JSON.stringify(p.leader.ranked().getRankFromElo(p.highestElo))}`));

        //     if (groups.length) games.push(groups);
        // })

        // ranks.forEach((rank, i) => {
        //     const prevRank = ranks[i - 1] || { min: 0, max: 0 };
        //     const nextRank = ranks[i + 1] || { min: 0, max: 0 };

        //     const bottomMinElo = Math.ceil((prevRank.min + (prevRank.max || 0)) / 2);
        //     const bottomMaxElo = nextRank.min - 1;
        //     const topMinElo = rank.min;
        //     const topMaxElo = Math.ceil((nextRank.min + (nextRank.max || 0)) / 2);

        //     // const bottomGroups = this.getGroupsInRange(bottomMinElo, bottomMaxElo);

        //     console.log(`${rank.name} `, { bottomMinElo, bottomMaxElo, topMinElo, topMaxElo })
        // })
        /** 
         * 
         * divide
         * 
        */
        // if (this.queue.getQueue().length >= playersPerGame) {
        //     // start a 10s countdown
        //     if (!this.matchStartDelay) {
        //         this.matchStartDelay = true;
        //         Util.wait(3000).then(() => {
        //             // this.bot.logger.log(this.bot.config.channels['queue' + queue], { content: `${Queue.getQueue().map(e => `<@${e.id}>`)}`, embeds: [this.bot.createSuccessEmbed().setDescription(`**QUEUE FILLED!** A *\`${Queue.name}\` game* will begin in **10** seconds.`)] }).then(msg => msg && (this.matchStartMessages[queue] = msg))
        //             setTimeout(() => {
        //                 this.matchStartDelay = false;
        //                 this.startMatch(false);
        //             }, countdownDuration);
        //         });
        //     };

        // }
    }
    remove(player: VerifiedConfig) {
        this.queue.remove(player);
        const leaderID = player.getUser().getParty()?.leader.id || player.id;
        this.refreshQueueGroup(player);
        this.groupsInQueue.delete(leaderID);
        player.set({ queueJoin: false });
        // this.updateQueueMessage(player);
    }
    private refreshQueueGroup(player: VerifiedConfig) {
        const group = this.queue.getQueueGroups().find(g => g.players.includes(player));
        if (group) {
            const groupInQueue = this.groupsInQueue.get(group.leader.id);
            this.groupsInQueue.set(group.leader.id, { ...group, queueStart: Date.now() });
        }
    }

    async startMatch(groups: queueGroup[], force = false) {
        console.log(`MATCH FOUND, PEOPLE IN QUEUE: ${this.queue.getQueue().length}`, `force=${force}`)

        if (!force && this.queue.getQueue().length < playersPerGame) {
            // if (this.matchStartMessages[queue]) this.matchStartMessages[queue]?.reply({ embeds: [this.bot.createErrorEmbed().setDescription(`Match cancelled. Not enough players.`)] });
            console.log(`Not enough players to start a match.`);
            return null;
        }

        groups.forEach(player => player.players.forEach(p => this.remove(p)));

        // this.bot.log('players:', players);
        this.bot.log(`&aMatch found for ${groups.map(p => p.players).flat().map(e => e.username).join(', ')}`);
        // delete all player's queue channels
        await this.bot.rankedManager.createGame(groups);

    }
}