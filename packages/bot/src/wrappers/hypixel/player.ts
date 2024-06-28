
import { Collection } from "discord.js";
import fetch, { Response } from "node-fetch";
import { hypixelKeys as KEYS } from "../../../../../config.json";
import { Util } from "../../util/Util";
const main = () => `http://api.hypixel.net/player?key=${KEYS[Math.floor(Math.random() * (KEYS.length))]}&uuid=`;
const withUsername = () => `http://api.hypixel.net/player?key=${KEYS[Math.floor(Math.random() * (KEYS.length))]}&username=`;
const playerDB = `https://playerdb.co/api/player/minecraft/`;
import { getRank, getPlusColor, getEmojiRank, getFormattedRank, getPlusColorMC, getSk1erRank, getEmojiRankFromFormatted, getLevel } from '../functions/general';
const cache = new Collection<string, any>()
const cacheLifespan = 60000;
let lastTimeReset = 30;
export default async function get(query, options = { force: false }) {
    return new Promise<any>(async res => {
        if (!query) return res({ displayname: query, exists: false })
        // console.log(cache.has(query))

        if (query.length <= 16) {
            let $uuid = await fetch(playerDB + query, { headers: { ["user-agent"]: `Ranked Bedwars Bot` } });
            try {
                let uuid = await $uuid.json();
                query = uuid.data.player.id;
            } catch (e) {
                console.log(e);
                return res(null);
            }
        } else {
            query = query.replace(/-/g, "");
        }
        if (cache.has(query) && !options.force) {
            // console.log(new Error())
            // console.log(`[CACHE] ${query} was cached! Using cache: ${cache.get(query).displayname}`)
            // console.log(`cache:`, cache.get(query).displayname)
            return res(cache.get(query));
        }
        let data: any = { throttle: true };
        while (data?.throttle) {
            const q = main() + query;
            // console.log(`[Hypixel-Player] Fetching Stats of ${q}...`);
            let unparsed = await (Promise.race([fetch(q), new Promise(res => setTimeout(() => res({ fetchtimeout: true }), 10000))])) as any as Response | { fetchtimeout: number };

            // maybe timeout ?? idfk .
            if (!(unparsed instanceof Response)) {
                console.log('THE TIME OUT WORKED ?!')
                return res(null);
            }

            data = await unparsed.json().catch(e => ({ outage: true }));
            // console.log(`[Hypixel-Player] Fetched stats of ${query}! (parsed)`, util.inspect(data, { depth: 0, colors: true }));
            // console.log(`${q}`, data.displayname)
            if (data?.throttle) {
                // console.log(`running throttle loop`)
                const nextReset = parseInt(unparsed.headers.get('retry-after') as string) || (lastTimeReset ?? 30);
                lastTimeReset = nextReset;
                console.log(`[HYPIXEL-PLAYER] Key throttled:`, data, `Trying again in ${nextReset} seconds...`)
                await Util.wait(nextReset * 1000)
            }
        }
        if (data.outage) return res({ outage: true })

        if (!data.player) {
            console.log(data);
            return res(null);
        }
        data.player.rank = getRank(data.player)
        data.player.color = getPlusColor(data.player.rankPlusColor, data.player.rank)
        data.player.emojiRank = getEmojiRank(data.player)

        data.player.mcPlusColor = getPlusColorMC(data.player.rank, data.player.rankPlusColor)
        data.player.formattedRank = getFormattedRank(data.player.rank, data.player.mcPlusColor)
        data.player.level = getLevel(data.player.networkExp)
        data.player._quests = data.player.quests;
        if (data.player.quests) data.player.quests = Object.fromEntries(Object.entries(data.player.quests).map(([k, v]: [any, any]) => ([k, v.completions?.length])).filter(([k, v]) => v))
        if (data.player.challenges) data.player.challenges = Object.values(data.player.challenges.all_time).reduce((p: number, c: number) => p + c, 0)
        // console.log(`setting cache: ${query} to ${data.player.displayname}`)
        cache.set(query, data.player);
        // console.log(`cache size: ${cache.size}`)
        setTimeout(() => {
            cache.delete(query);
        }, cacheLifespan)

        res(data.player)
    })
}
// const BASE = 10000;
// const GROWTH = 2500;
// const HALF_GROWTH = 0.5 * GROWTH;
// const REVERSE_PQ_PREFIX = -(BASE - 0.5 * GROWTH) / GROWTH;
// const REVERSE_CONST = REVERSE_PQ_PREFIX * REVERSE_PQ_PREFIX;
// const GROWTH_DIVIDES_2 = 2 / GROWTH;