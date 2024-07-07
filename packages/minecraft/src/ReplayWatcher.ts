import { AutoModerationRule, MessageCreateOptions } from "discord.js";
import { BotOptions, Bot, createBot, BotEvents } from "mineflayer";
import { MinecraftToBotRoutes } from "../../bot/src/core/api/BotAPI";
import accounts from "../../../accounts.json";
import { AutoScoreAPI, gamesQueue } from ".";
import { BotToAutoScorerData } from "./AutoscoreAPI";
import { Util } from "../../bot/src/util/Util";
const teamColors = {
    team1: ";31m[0m[0;37m[0;34m[0;31m",
    team2: ";31m[0m[0;37m[0;34m[0;31m[0;34m"
}

export class ReplayWatcher {
    public bot: Bot;
    public isRunning: boolean;
    public loggedIn: boolean;
    public startTime: number;
    public isInReplay = false;
    public tempNickedUsernameMap: Record<string, string> = {};
    public activeGame: BotToAutoScorerData['processgame'] | null = null;
    public replayTotalTime: string | null = null;
    public replayCurrentTime: string | null = null;
    public currentGameStats: Record<string, { kills: number, beds: number, deaths: number, isFinalKilled: boolean }> = {};
    public hasValidatedUsernames = false;
    public isInLobby = false;
    public lastLocraw: string = "";
    private locrawInterval: NodeJS.Timeout | null = null;
    constructor(public email: string, public channelID: string) {
        this.bot = createBot({
            username: email,
            auth: 'microsoft',
            host: 'hypixel.net',
            port: 25565,
            keepAlive: true,
            onMsaCode: (data) => {
                console.log(`${email} needs to enter code: ${data.verification_uri} ${data.user_code}`);
                AutoScoreAPI.send('log', { channelID: this.channelID, data: { content: `${email} needs to enter code: ${data.verification_uri} ${data.user_code}`, }, email: this.email });
            },
            profilesFolder: `./profiles/${email}`,
            version: '1.8.9',
        })
        this.isRunning = true;
        this.startTime = Date.now();
        this.bot.on("login", this.onLogin.bind(this));
        this.bot.on("spawn", this.onSpawn.bind(this));
        this.bot.on("message", this.onMessage.bind(this));
        this.bot.on('end', this.onEnd.bind(this));
        this.bot.on('kicked', this.onKicked.bind(this));
    }
    private clearCurrentProcess() {
        this.activeGame = null;
        this.hasValidatedUsernames = false;
        this.isInReplay = false;
        this.currentGameStats = {};
        this.replayCurrentTime = null;
        this.replayTotalTime = null;
        this.tempNickedUsernameMap = {};
    }
    public getUptime() {
        return Date.now() - this.startTime;
    }
    public async processReplay(data: BotToAutoScorerData['processgame']) {
        this.activeGame = data;
        this.hasValidatedUsernames = false;
        const { replayID, team1, team2, gameID, force } = data;
        console.log(`!!!!!!!!!!!!! Processing game #${gameID} (Replay: ${replayID}) between ${team1.map(({ username }) => username).join(', ')} and ${team2.map(({ username }) => username).join(', ')}`);
        AutoScoreAPI.send('log', {
            channelID: this.channelID, email: this.email, data: {
                content: `\`\`\`ansi
[2;37m[Game ${gameID}][0m [2;32mAuto Scoring Game[0m
[0m[4;32m[0m[2;32m[0m[2;37m[0m[2;30mReplay ID: ${replayID}[0m
[2;37m[2;31mTeam 1:[0m[2;37m[0m [2;31m[2;37m${team1.map(p => p.username).join(', ')}[0m[2;31m[0m
[2;37m[2;34mTeam 2:[0m[2;37m[0m [2;32m[2;34m[2;37m${team2.map(p => p.username).join(', ')}[0m[2;34m[0m[2;32m[0m
[2;30mWorker: ${this.bot.username}[0m
\`\`\``}
        })
        if (!this.isInLobby) this.bot.chat('/l');
        await Util.wait(1000);
        this.bot.chat(`/replay ${replayID}`);
    }
    private onEnd: BotEvents['end'] = async () => {
        console.log(`Bot ${this.bot.username} ended.`)
        AutoScoreAPI.send('log', {
            channelID: this.channelID, email: this.email, data: {
                content: `🔴 **${this.bot.username}** left.`
            }
        })
        this.isRunning = false;
    }
    private onKicked: BotEvents['kicked'] = async (reason) => {
        console.log(`Bot ${this.bot.username} kicked: ${reason}`)
        AutoScoreAPI.send('log', {
            channelID: this.channelID, email: this.email, data: {
                content: `🔴 **${this.bot.username}** was kicked: ${reason}.`
            }
        })

        this.isRunning = false;
        this.bot.end();
    }
    private onSpawn: BotEvents['spawn'] = async () => {
        if (this.loggedIn) return;
        this.loggedIn = true;
        AutoScoreAPI.send('log', {
            channelID: this.channelID, email: this.email, data: {
                content: `🟢 **${this.bot.username}** joined the server.`
            }
        })
    }
    private onLogin: BotEvents['login'] = async () => {
        console.log(`Joined world as ${this.bot.username}`);
        if (!this.locrawInterval) {
            this.locrawInterval = setInterval(() => {
                // console.log(this.isInLobby);
                if (this.bot?.scoreboard?.sidebar?.itemsMap) {
                    const server = Object.values(this.bot.scoreboard.sidebar.itemsMap)[0]?.displayName.toString().replace(/[^a-zA-Z0-9 !@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g, '')?.split(' ').slice(-1)[0];
                    if (server?.startsWith('L')) {
                        return this.isInLobby = true;
                    }
                }
                this.isInLobby = false;
            }, 250)
        }
    }
    private async validateUsernames() {
        if (!this.activeGame) return console.error(`!!! No current process to validate usernames for.`);
        this.hasValidatedUsernames = true;
        let validated: string[] = [];
        await Util.wait(1000);
        const players = (await this.bot.tabComplete(' ')).filter(p => p !== this.bot.username);

        console.log(`Players In Replay:`, players);

        const rbwPlayers = [...this.activeGame.team1, ...this.activeGame.team2];
        console.log(`Players In Game:`, rbwPlayers.map(p => p.username))
        rbwPlayers.forEach(({ username }) => {
            const player = players.find(p => p == username);
            if (!player) {
                // missing.push(username);
                return console.error(`!!!!!! FAILED TO FIND PLAYER ${username} IN GAME !!!!!!`);
            }
            validated.push(player);
            this.currentGameStats[player] = { kills: 0, beds: 0, deaths: 0, isFinalKilled: false };
        })
        let missing: string[] = players.filter(p => !validated.includes(p));
        console.log(`MISSING PLAYERS:`, missing)
        if (rbwPlayers.length === players.length && missing.length === 1) {
            // assume missing player is last person
            const missingPlayer = rbwPlayers.find(p => !validated.includes(p.username));
            if (missingPlayer) {
                // console.log()
                validated.push(missingPlayer.username);
                this.currentGameStats[missingPlayer.username] = { kills: 0, beds: 0, deaths: 0, isFinalKilled: false };
                this.tempNickedUsernameMap[missing[0]] = missingPlayer.username;
                console.log(`>>> Assuming that the player in game "${missing[0]}" is actually the ranked player "${missingPlayer.username}".`)
                AutoScoreAPI.send('log', { channelID: this.channelID, email: this.email, data: { content: `\`\`\`ansi\nAssuming that the player in game "${missing[0]}" is actually the ranked player "${missingPlayer.username}".\n\`\`\`` } })
                missing = [];
            }
        }


        const totalPlayers = rbwPlayers.length;
        if (validated.length !== totalPlayers) {
            AutoScoreAPI.send('score', {
                success: false,
                error: `players_not_found`,
                gameID: this.activeGame.gameID,
                foundPlayers: players
            })
            AutoScoreAPI.send('log', {
                channelID: this.channelID, email: this.email, data: {
                    content: `\`\`\`ansi
[2;37m[Game ${this.activeGame.gameID}] [2;31mFailed to validate all players in the game (${validated}/${totalPlayers}). Aborting auto score.[0m[2;37m[0m
\`\`\``}
            })
        } else {
            AutoScoreAPI.send('log', {
                channelID: this.channelID, email: this.email, data: {
                    content: `\`\`\`ansi
[2;37m[Game ${this.activeGame.gameID}] [2;31m[2;32mSuccessfully validated ${validated}/${totalPlayers} players. [0m[2;31m[0m[2;37m[0m
\`\`\``
                }
            })
        }
        console.log(`${validated.length === totalPlayers ? '✅' : '❌'} ${validated}/${totalPlayers} players validated and updated.`);
        return validated.length === totalPlayers;
    }
    private onMessage: BotEvents['message'] = async (message, position) => {


        const replayMatch = message.toString().match(/(\w+)\s+(\d{2}:\d{2})\s+\/\s+(\d{2}:\d{2})\s+(\d+\.\dx)/);
        if (replayMatch && this.activeGame) {
            this.isInReplay = true;
            if (!this.hasValidatedUsernames) {
                const validated = await this.validateUsernames();
                if (validated) {
                    console.log(`Game validated. Continuing with replay...`);
                    for (let i = 0; i < 3; i++) await this.increaseReplaySpeed();
                    await this.playReplay();
                } else {
                    console.log(`Game failed to validate.`);
                    await Util.wait(1000);
                    this.bot.chat("/l");
                    await Util.wait(3000);
                    this.clearCurrentProcess();
                    // error is handled and sent to bot in validateusernames method
                }
            }
            const [_, status, currentTime, totalTime, speed] = replayMatch;
            console.log(`status: ${status}, currentTime: ${currentTime}, totalTime: ${totalTime}, speed: ${speed}`);
            this.replayCurrentTime = currentTime;
            this.replayTotalTime = totalTime;
            if (status === 'Finished') {
                console.log(this.currentGameStats);
                const alive = Object.entries(this.currentGameStats).filter(([name, stats]) => !stats.isFinalKilled)
                const team1Alive = alive.filter(([name, stats]) => this.activeGame?.team1.find(p => p.username === name)).length;
                const team2Alive = alive.filter(([name, stats]) => this.activeGame?.team2.find(p => p.username === name)).length;
                const winner = team1Alive > team2Alive ? 'team1' : 'team2';
                const winningTeam = this.activeGame[winner].map(p => p.username);
                const killsLb = Object.entries(this.currentGameStats).sort((a, b) => b[1].kills - a[1].kills);
                const topKills = killsLb[0][1].kills;
                const mvps = killsLb.filter(([name, stats]) => stats.kills === topKills);
                AutoScoreAPI.send('log', {
                    channelID: this.channelID, email: this.email, data: {
                        content: `\`\`\`ansi
[2;37m[Game ${this.activeGame.gameID}] [2;31m[2;32mSuccessfully auto scored.
[2;34mWinning Team:[2;37m ${this.activeGame[winner].map(p => `${p.username}`).join(', ')}
[0m[0;37m[0m[0;37m[0m[0;37m[0m[0;37m[0m[2;37m[2;32m[2;33mTop Killer(s):[0m[2;32m[0m[2;37m ${mvps.map(([name, stats]) => `${name} (${stats.kills})`).join(', ')}
[2;33mBed Breaker(s):[0m[2;37m ${killsLb.filter((a) => a[1].beds).map(p => `${p[0]} (${p[1].beds})`).join(', ')}[0m[2;32m[0m[2;31m[0m[2;37m[0m
\`\`\``
                    }
                })
                AutoScoreAPI.send('score', {
                    success: true,
                    force: this.activeGame.force,
                    gameID: this.activeGame.gameID,
                    results: Object.fromEntries(Object.entries(this.currentGameStats).map(([username, data]) => [username, { kills: data.kills, beds: data.beds }])),
                    winningTeam: winner
                });
                this.clearCurrentProcess();
                this.bot.chat('/l');
                await Util.wait(1000);
            }
            return;
        }
        if (this.isInReplay && this.activeGame) {
            const { json } = message;
            const players = this.activeGame.team1.concat(this.activeGame.team2).map(({ username }) => username).concat(Object.keys(this.tempNickedUsernameMap));
            console.log(`players:`, players);
            console.log(`nickedPlayers:`, this.tempNickedUsernameMap);
            const killActionFilter = json.extra?.filter((j: any) => players.includes(j.text.trim()));
            const bedBreakActionFilter = json.extra?.[1]?.text === "BED DESTRUCTION > ";
            if (bedBreakActionFilter) {
                console.log(`bed break detected data:`, json.extra)
                let username = json.extra.slice(-2, -1)?.[0]?.text.match(/\w+$/g)?.[0];
                const player = this.tempNickedUsernameMap[username] || username;
                if (player) {
                    console.log(`bed break detected:`, player)
                    this.currentGameStats[player].beds++;
                } else {
                    console.error(`!!! FAILED TO DETECT PPLAYER FOR BED BREAK !!!!!`)
                }
            }
            if (killActionFilter?.length) {
                const action = {
                    victim: killActionFilter[0].text.trim(),
                    killer: killActionFilter[1]?.text.trim(),
                    finalKill: !!message.toString().match("FINAL KILL!")
                }
                const victim = this.tempNickedUsernameMap[action.victim] || action.victim;
                const killer = this.tempNickedUsernameMap[action.killer] || action.killer;
                if (victim) this.currentGameStats[victim].deaths++;
                if (killer) this.currentGameStats[killer].kills++;
                if (action.finalKill) this.currentGameStats[victim].isFinalKilled = true;
                console.log(`action detected:`, action)
                // move forward
                this.bot.setControlState(Util.randomIndex(['forward', 'back', 'left', 'right']), true);
                Util.wait(1000).then(() => this.bot.clearControlStates());
            } else {
                console.log(`unknown action:`, message.toAnsi())
            }
        }
        if (!this.isInReplay && this.activeGame) {
            const invalidReplayTest = message.toString().match(/^Invalid replay ID!$/) || message.toString().match(/^Couldn't find a replay by that UUID!$/);
            if (invalidReplayTest) {
                console.error(`Invalid Replay detected!`)
                await Util.wait(3000);
                AutoScoreAPI.send('score', {
                    success: false,
                    error: `game_not_found`,
                    gameID: this.activeGame.gameID,
                })
                AutoScoreAPI.send('log', {
                    channelID: this.channelID, email: this.email, data: {
                        content: `\`\`\`ansi
[2;37m[Game ${this.activeGame.gameID}] [2;31mReplay ID "${this.activeGame.replayID}" not found! Aborting auto score.[0m[2;37m[0m
\`\`\``}
                })
                this.clearCurrentProcess();
            }
        }
        console.log(`[${this.bot.username}]`, message.toAnsi());

    }
    private async playReplay() {
        this.bot.setQuickBarSlot(4);
        await Util.wait(500);
        this.bot.activateItem();
    }
    private async increaseReplaySpeed() {
        this.bot.setQuickBarSlot(6);
        await Util.wait(500);
        this.bot.activateItem();
    }
}





