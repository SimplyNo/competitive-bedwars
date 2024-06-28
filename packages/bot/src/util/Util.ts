import fs from "fs";
import path from "path";
import Chalk from "chalk";
import moment from "moment";
import { ranks } from "../../../../score_sheet.json";

const table = {
    0: Chalk.black,
    1: Chalk.blue,
    2: Chalk.green,
    3: Chalk.cyan,
    4: Chalk.red,
    5: Chalk.magenta,
    6: Chalk.yellow,
    7: Chalk.gray,
    8: Chalk.white,
    9: Chalk.bgBlue,
    a: Chalk.greenBright,
    b: Chalk.cyanBright,
    c: Chalk.redBright,
    d: Chalk.bgRedBright,
    e: Chalk.yellowBright,
    f: Chalk.white
}

const randomChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
export class Util {
    public static plusify(num: number) {
        return num > 0 ? `+${num}` : num.toString();
    }
    public static chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const result: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            result.push(array.slice(i, i + chunkSize));
        }
        return result;
    }
    public static getRankFromElo(elo: number) {
        const rank = [...ranks].reverse().find(r => r.min <= elo) || ranks[ranks.length - 1];
        const percent = Math.round(((elo - rank.min) / (rank.max - rank.min)) * 100)
        return {
            rank: rank.name,
            percent: rank.name === 'platinum' ? 100 : percent
        }
    }
    public static mergeDefault(def, given) {
        if (!given) return def;
        for (const key in def) {
            if (!Object.hasOwn(given, key) || given[key] === undefined) {
                given[key] = def[key];
            } else if (given[key] === Object(given[key])) {
                given[key] = this.mergeDefault(def[key], given[key]);
            }
        }

        return given;
    }
    public static formatDuration(ms: number): string {
        const duration = moment.duration(ms);
        const minutes = duration.minutes() + duration.hours() * 60;
        const seconds = duration.seconds();
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    public static randomIndex<T>(array: T[]): T;
    public static randomIndex<T>(array: T[], amount: number, repeats?: boolean): T[];
    public static randomIndex<T>(array: T[], amount?: number, repeats = true) {

        if (amount) {
            let arr: T[] = [];
            for (let i = 0; i < amount; i++) {
                const item = this.randomIndex(array);
                if (!repeats) {
                    array = array.filter(e => e !== item);
                }
                arr.push(item);
            }
            return arr;
        }
        return array[Math.floor(Math.random() * array.length)];
    }
    public static sterilize<T>(string: string, variable: T) {
        if (typeof variable === "number") {
            return string.replace('%s', variable.toLocaleString())
        }
        return string.replace('%s', variable as any)
    }
    public static getNumberBetween(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    public static getChance(decimalChance: number) {
        return Math.random() < decimalChance;
    }
    public static getMonthDiff(d1: Date, d2: Date) {
        let months = 0;
        months = d2.getFullYear() - d1.getFullYear();
        months -= d1.getMonth();
        months += d2.getMonth();
        return months <= 0 ? 0 : months;
    }
    public static getMonthsSinceDate(date: string) {
        const now = new Date();
        const then = new Date(date);
        return (now.getFullYear() - then.getFullYear()) * 12 + now.getMonth() - then.getMonth();
    }
    public static parsePath(path: string, obj: Object): number {
        let val: any;
        try {
            const paths = path.split('+').map(e => `(Number(obj.${e}) || 0)`.replace(/\./g, '?.'))
            const code = paths.join('+');
            val = eval(code);
            if (isNaN(parseInt(val))) val = 0;
        } catch (e) {
            console.error(`Failed to parse path: ${path}`, e);
            val = 0;
        }
        return val;
    }
    public static parseMessageCodes(msg) {
        if (typeof msg !== "string") return msg;
        msg = '&f' + msg;
        let codes = msg.match(/&[0-9a-f]/g) || [];

        let ary = Array.from(msg);
        let parts: any = [];
        codes.forEach((char, i) => {
            let nextCodeStart = msg.indexOf(codes[i + 1]) != -1 ? msg.indexOf(codes[i + 1]) : ary.length;
            let index = msg.indexOf(char);
            let part = msg.slice(index, nextCodeStart);

            parts.push(table[char[1]](part.replace(char, '')))
            msg = msg.replace(part, '');
        })

        return parts.join('')
    }


    static splitMessage(text: string, { maxLength = 2_000, char = '\n', prepend = '', append = '' }): string[] {


        text = text;
        if (text.length <= maxLength) return [text];
        let splitText = [text];
        if (Array.isArray(char)) {
            while (char.length > 0 && splitText.some(elem => elem.length > maxLength)) {
                const currentChar = char.shift();
                if (currentChar instanceof RegExp) {
                    splitText = splitText.flatMap(chunk => chunk.match(currentChar)) as string[];
                } else {
                    splitText = splitText.flatMap(chunk => chunk.split(currentChar));
                }
            }
        } else {
            splitText = text.split(char);
        }
        if (splitText.some(elem => elem.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN');
        const messages: string[] = [];
        let msg = '';
        for (const chunk of splitText) {
            if (msg && (msg + char + chunk + append).length > maxLength) {
                messages.push(msg + append);
                msg = prepend;
            }
            msg += (msg && msg !== prepend ? char : '') + chunk;
        }
        return messages.concat(msg).filter(m => m);
    }
    public static getAllFiles(dirPath, arrayOfFiles?) {
        const files = fs.readdirSync(dirPath)
        arrayOfFiles = arrayOfFiles || [];
        files.forEach(function (file) {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) arrayOfFiles = Util.getAllFiles(dirPath + "/" + file, arrayOfFiles)
            else arrayOfFiles.push(path.join(dirPath, "/", file))
        })
        return arrayOfFiles;
    }
    public static parseInt(num: string) {
        let scale = 1;
        if (num.endsWith('k')) {
            scale = 1000;
            num = num.slice(0, -1);
        } else if (num.endsWith('m')) {
            scale = 1000000;
            num = num.slice(0, -1);
        } else if (num.endsWith('b')) {
            scale = 1000000000;
            num = num.slice(0, -1);
        }

        return Math.floor(Number(num) * scale);
    }
    public static parseTime(string = "") {
        let list = string.split(/([0-9]*\w)/).filter(e => e.trim());
        let ms = 0;
        list.forEach(str => {
            if (str.length < 2) return;
            let suffix = str.slice(str.length - 1);
            let time = parseInt(str.slice(0, str.length - 1));
            // console.log(suffix)
            if (isNaN(time)) return 0;
            if (suffix == 's') {
                ms += (time * 1000);
            } else if (suffix == 'm') {
                ms += (time * 60 * 1000)
            } else if (suffix == 'h') {
                ms += (time * 60 * 60 * 1000)
            } else if (suffix == 'd') {
                ms += (time * 24 * 60 * 60 * 1000)
            } else if (suffix == 'w') {
                ms += (time * 7 * 24 * 60 * 60 * 1000)
            }
        })
        let dateString = this.getDateString(ms);
        return !ms ? null : { ms: ms, string: dateString };
    }
    public static search(str: string, list: string[]) {
        let results: string[] = [];
        list.forEach(item => {
            if (item.toLowerCase().includes(str.toLowerCase())) results.push(item);
        })
        return results;
    }
    public static getDiscordTimeFormat(ms: number, type: 'R' | 'f' | 'D') {
        return `<t:${Math.floor(ms / 1000)}:${type}>`
    }
    public static genHeadImage(uuid: string) {
        return `https://minotar.net/helm/${uuid}/1000.png`;
        // return "https://crafatar.com/avatars/" + uuid + "?overlay=true";
    }
    public static nFormatter(num: number, digits: number) {
        const lookup = [
            { value: 1, symbol: "" },
            { value: 1e3, symbol: "k" },
            { value: 1e6, symbol: "M" },
            { value: 1e9, symbol: "G" },
            { value: 1e12, symbol: "T" },
            { value: 1e15, symbol: "P" },
            { value: 1e18, symbol: "E" }
        ];
        const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
        var item = lookup.slice().reverse().find(function (item) {
            return num >= item.value;
        });
        return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
    }
    public static shuffle<T>(ary: T[]): T[] {
        let array = ary.slice(0);
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array
    }
    public static capitalizeFirstLetter(string: string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
    public static printStackTrace(): void {
        const stack = new Error().stack;
        console.log("Stack Trace:", stack);
    }

    public static getDateString(ms: number, format = "%year%%yearStr% %month%%monthStr% %week%%weekStr% %day%%dayStr% %hour%%hourStr% %min%%minStr% %sec%%secStr%") {
        if (!ms) return "0m and 0s";
        let seconds = Math.floor(ms / 1000 % 60);
        let secondsStr = seconds && 's';
        let minutes = Math.floor(ms / 1000 / 60 % 60);
        let minutesStr = minutes && 'm';
        let hours = Math.floor(ms / 1000 / 60 / 60 % 24);
        let hoursStr = hours && 'h';
        let days = Math.floor(ms / 1000 / 60 / 60 / 24 % 7);
        let daysStr = days && 'd';
        let weeks = Math.floor(ms / 1000 / 60 / 60 / 24 / 7 % 31);
        let weeksStr = weeks && 'w';
        let months = Math.floor(ms / 1000 / 60 / 60 / 24 / 7 / 31 % 365);
        let monthsStr = months && 'M';
        let years = Math.floor(ms / 1000 / 60 / 60 / 24 / 7 / 31 / 365);
        let yearsStr = years && 'Y';

        let dateString = format
            .replace('%SEC%', seconds.toString())
            .replace('%SECSTR%', secondsStr.toString())
            .replace('%MIN%', minutes.toString())
            .replace('%MINSTR%', minutesStr.toString())
            .replace('%HOUR%', hours.toString())
            .replace('%HOURSTR%', hoursStr.toString())
            .replace('%DAY%', days.toString())
            .replace('%DAYSTR%', daysStr.toString())
            .replace('%WEEK%', weeks.toString())
            .replace('%WEEKSTR%', weeksStr.toString())
            .replace('%MONTH%', months.toString())
            .replace('%MONTHSTR%', monthsStr.toString())
            .replace('%YEAR%', years.toString())
            .replace('%YEARSTR%', yearsStr.toString())
            .replace('%sec%', String(seconds || ''))
            .replace('%secStr%', secondsStr || '')
            .replace('%min%', String(minutes || ''))
            .replace('%minStr%', minutesStr || '')
            .replace('%hour%', String(hours || ''))
            .replace('%hourStr%', hoursStr || '')
            .replace('%day%', String(days || ''))
            .replace('%dayStr%', daysStr || '')
            .replace('%week%', String(weeks || ''))
            .replace('%weekStr%', weeksStr || '')
            .replace('%month%', String(months || ''))
            .replace('%monthStr%', monthsStr || '')
            .replace('%year%', String(years || ''))
            .replace('%yearStr%', yearsStr || '')
        // console.log(dateString)
        // let dateString = `${years ? years + getPlural(years, ' year') : ''} ${months ? months + getPlural(months, ' month') : ''} ${weeks ? weeks + getPlural(weeks, ' week') : ''} ${days ? days + getPlural(days, ' day') : ''} ${hours ? hours + getPlural(hours, ' hour') : ''} ${minutes ? minutes + getPlural(minutes, ' minute') : ''} ${seconds ? seconds + getPlural(seconds, 'second') : ''}`.trim();
        // console.log(secondsStr, seconds)
        // console.log(minutesStr, minutes)
        return dateString.trim();
    }
    public static getPlural(num: number, string: string) {
        if (num == 1) return string;
        return string + 's';
    }
    public static isBetween(num: number, min: number, max: number) {
        return num >= min && num < max;
    }
    public static formatDiscordMessage(message) {
        return message.replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/~/g, '\\~').replace(/`/g, '\\`').replace(/>/g, '\\>');
    }
    public static wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    public static getNext11_59PMTimestamp(): number {
        const now = new Date();
        const targetTime = new Date();

        // Set the target time to 11:59 PM
        targetTime.setUTCHours(3, 59, 59);

        // Check if the current time is already past 11:59 PM
        if (now > targetTime) {
            // If so, set the target time to tomorrow
            targetTime.setDate(targetTime.getDate() + 1);
        }

        // Set the time zone offset to EST (UTC-5)
        // targetTime.setUTCHours(targetTime.getUTCHours() - 5);

        return targetTime.getTime();
    }
    public static getNextThursday1159PMTimestamp(): number {
        const now = new Date();
        let targetTime = new Date();

        // Set the target time to the next Thursday
        targetTime.setUTCDate(targetTime.getUTCDate() + (5 - targetTime.getUTCDay() + 7) % 7);
        targetTime.setUTCHours(3, 59, 59);
        // Check if the current time is already past Thursday 11:59 PM
        if (now > targetTime) {
            // If so, set the target time to next week's Thursday
            targetTime.setUTCDate(targetTime.getUTCDate() + 7);
        }

        // Set the time zone offset to EST (UTC-5)
        // targetTime.setUTCHours(targetTime.getUTCHours() - 5);

        return targetTime.getTime();
    }
    static clamp(num: number, min: number, max: number) {
        return Math.min(Math.max(num, min), max);
    }
    public static genRandomChars(length: number) {
        let result = '';
        for (let i = 0; i < length; i++) {
            // genchar that isnt already in result


            let char = randomChars[Math.floor(Math.random() * randomChars.length)];
            while (result.includes(char)) {
                char = randomChars[Math.floor(Math.random() * randomChars.length)];
            }
            result += char;
        }
        return result;
    }
}