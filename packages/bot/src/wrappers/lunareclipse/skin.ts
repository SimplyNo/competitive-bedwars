import fetch from "node-fetch";
import { hypixelKeys as KEYS } from "../../../../../config.json";
import { Util } from "../../util/Util";
import fs from 'fs';
import { Redis } from "ioredis";
const skinURL = (pose: string, username: string) => `https://starlightskins.lunareclipse.studio/render/${pose}/${username}/full`;
const tempCache = new Map<string, Buffer>();
export default async function get(pose: string, username: string) {
    const redis: Redis = global.redis as any;
    // console.log(`redis:`, redis);
    return new Promise<any>(async res => {
        const cache = (await redis.getBuffer(`cache-skin:${username.toLowerCase()},${pose}`));
        if (cache) return res(cache);


        let unparsed = <Response>await Promise.race([fetch(skinURL(pose, username), { headers: { ["user-agent"]: `Bedwars Competitive Bot/1.0` } }), Util.wait(5000)]);
        if (!unparsed.ok) return res(Buffer.from(fs.readFileSync('../../assets/steve.png')));
        const arrayBuffer = await unparsed.arrayBuffer();
        const data = Buffer.from(arrayBuffer);

        console.log(`DATA GOT: `, data);
        redis.setex(`cache-skin:${username.toLowerCase()},${pose}`, 90 * 60, data);

        return res(data);
    })
}