import { Bot } from "../../Bot";
import { RawVerifiedConfig, VerifiedConfig, StoredUserGame } from "../../types/config/VerifiedConfig";
import { ranks } from "../../../../../score_sheet.json";
import { validStats } from "./RankedGameManager";

export class RankedUserManager {
    constructor(private bot: Bot, public verifiedUser: VerifiedConfig) { }
    public getPopulatedRankedHistory() {
        return this.verifiedUser.rbw.gameHistory.map(game => {
            return this.bot.rankedManager.getGameByID(game.id);
        })
    }
    public _deleteGame(id: number) {
        const newRecord = this.verifiedUser.rbw;
        newRecord.gameHistory = newRecord.gameHistory.filter(g => g.id !== id);
        this.verifiedUser.set({ rbw: newRecord });
    }
    public _resetStats() {
        this.verifiedUser.set({ rbw: { elo: 0, gameHistory: [], wins: 0, losses: 0, voids: 0, mvps: 0, streak: 0, highestStreak: 0, bedsBroken: 0, commends: 0 } });
    }
    public addElo(elo: number) {
        this.setElo(this.verifiedUser.rbw.elo + elo);
    }
    public addCommend() {
        this.verifiedUser.rbw.commends++;
        this.verifiedUser.set({ rbw: this.verifiedUser.rbw });
    }
    public setElo(elo: number) {
        this.bot.log(`&b[ELO CHANGE] [${this.verifiedUser.username}] &d${this.verifiedUser.rbw.elo} &7-> &d${elo}`)
        this.verifiedUser.rbw.elo = Math.max(elo, 0);
        this.verifiedUser.set({ rbw: this.verifiedUser.rbw });
        this.verifiedUser.getUser().updateMember(true);
    }
    public getStat(stat: validStats) {
        if (stat === 'wlr') return this.verifiedUser.rbw.wins / this.verifiedUser.rbw.losses;
        if (stat === 'games') return this.verifiedUser.rbw.gameHistory.length;
        if (stat === 'beds_percent') return this.verifiedUser.rbw.bedsBroken / this.verifiedUser.rbw.gameHistory.length;
        if (stat === 'mvp_percent') return this.verifiedUser.rbw.mvps / this.verifiedUser.rbw.gameHistory.length;
        return this.verifiedUser.rbw[stat];
    }
    public getRankFromElo(elo = this.verifiedUser.rbw.elo) {
        const rank = [...ranks].reverse().find(r => r.min <= elo) || ranks[ranks.length - 1];
        const percent = Math.round(((elo - rank.min) / (rank.max - rank.min)) * 100)
        // console.log(elo, rank, percent)
        return {
            rank: rank.name,
            percent: rank.name === 'platinum' ? 100 : percent,
            win: rank.win,
            lose: rank.lose,
            bed_break: rank.bed_break,
            mvp: rank.mvp,
            min: rank.min,
            role: rank.role
        }
    }
    public getWinsTillNextPosition() {
        const userPos = this.getPosition() - 1;
        const nextUser = this.bot.rankedManager.getLeaderboard('elo')[userPos - 1];
        if (!nextUser) return 0;
        console.log(`pos: `, userPos, `next:`);
        const nextUserElo = nextUser.rbw.elo;
        const elo = this.verifiedUser.rbw.elo;
        const eloDiff = nextUserElo - elo;
        const rank = this.getRankFromElo();
        const winElo = rank.win;
        const wins = Math.ceil(eloDiff / winElo) || 1;
        return wins;
    }
    public scoreGame(id: number, win: boolean, mvp: boolean, bedBreak: boolean, forceElo?: { startingElo: number }) {
        const rank = this.getRankFromElo(forceElo?.startingElo);
        let eloChange = win ? rank.win : -rank.lose;
        if (mvp) eloChange += rank.mvp;
        if (bedBreak) eloChange += rank.bed_break;
        if (!forceElo) eloChange = Math.max(this.verifiedUser.rbw.elo + eloChange, rank.min) - this.verifiedUser.rbw.elo;
        this.addElo(eloChange);
        const existingGame = this.verifiedUser.rbw.gameHistory.find(g => g.id === id);
        const existingGameIndex = existingGame ? this.verifiedUser.rbw.gameHistory.indexOf(existingGame) : null;
        let newRecord = this.verifiedUser.rbw;
        const newGame: StoredUserGame = { id, outcome: win ? 'win' : 'loss', mvp, bedBreak, elo: this.verifiedUser.rbw.elo, eloChange, date: existingGame?.date || Date.now() };
        if (existingGameIndex !== null) newRecord.gameHistory[existingGameIndex] = newGame;
        else newRecord.gameHistory.push(newGame);
        newRecord.wins = newRecord.gameHistory.filter(g => g.outcome === 'win').length;
        newRecord.losses = newRecord.gameHistory.filter(g => g.outcome === 'loss').length;
        newRecord.mvps = newRecord.gameHistory.filter(g => g.mvp).length;
        newRecord.bedsBroken = newRecord.gameHistory.filter(g => g.bedBreak).length;
        newRecord.streak = win ? newRecord.streak + 1 : 0;
        newRecord.highestStreak = Math.max(newRecord.streak, newRecord.highestStreak);
        this.verifiedUser.set({ rbw: newRecord });
        return eloChange;
    }
    public undoGame(id: number, eloChange: number) {
        this.addElo(-eloChange);
        let newRecord = this.verifiedUser.rbw;
        const game = newRecord.gameHistory.find(g => g.id === id);
        if (!game) return console.error(`trying to undo a game that doesn't exist... nice`);
        const gameIndex = newRecord.gameHistory.indexOf(game);
        newRecord.gameHistory[gameIndex].outcome = 'void';
        // newRecord.gameHistory = newRecord.gameHistory.filter(g => g.id !== id);
        newRecord.wins = newRecord.gameHistory.filter(g => g.outcome === 'win').length;
        newRecord.losses = newRecord.gameHistory.filter(g => g.outcome === 'loss').length;
        newRecord.mvps = newRecord.gameHistory.filter(g => g.mvp).length;
        newRecord.bedsBroken = newRecord.gameHistory.filter(g => g.bedBreak).length;
        newRecord.streak = 0;
        for (let i = newRecord.gameHistory.length - 1; i >= 0; i--) {
            if (newRecord.gameHistory[i].outcome === 'win') newRecord.streak++;
            else break;
        }
        newRecord.highestStreak = Math.max(newRecord.streak, newRecord.highestStreak);
        this.verifiedUser.set({ rbw: newRecord });
    }
    public scoreVoidGame(id: number) {
        let newRecord = this.verifiedUser.rbw;
        const existingGame = this.verifiedUser.rbw.gameHistory.find(g => g.id === id);
        const existingGameIndex = existingGame ? this.verifiedUser.rbw.gameHistory.indexOf(existingGame) : null;
        const newGame: StoredUserGame = { id, outcome: 'void', bedBreak: false, mvp: false, elo: this.verifiedUser.rbw.elo, eloChange: 0, date: Date.now() };
        if (existingGameIndex !== null) newRecord.gameHistory[existingGameIndex] = newGame;
        else newRecord.gameHistory.push(newGame);
        newRecord.voids++;
        this.verifiedUser.set({ rbw: newRecord });
    }
    public getPosition(stat: validStats = 'elo') {
        return this.bot.rankedManager.getLeaderboard(stat).findIndex(u => u.id === this.verifiedUser.id) + 1;
    }
}