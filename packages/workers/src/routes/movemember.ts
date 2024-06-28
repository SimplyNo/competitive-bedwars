import { getWorker } from "..";
import { BotToWorkerData, WorkerAPIRoute } from "../WorkerAPI";
import { mainServer } from "../../../../config.json";
import { GuildVoiceChannelResolvable } from "discord.js";
export default {
    type: 'post',
    path: '/movemember',
    async execute(req, res) {
        const options = req.body as BotToWorkerData['movemember'];
        console.log(`/movemember:`, options)
        const worker = getWorker();
        const guild = worker.guilds.cache.get(mainServer);
        if (!guild) return res.status(404).send({ error: `Guild not found` });
        const member = await guild.members.fetch(options.memberID).catch(e => null);
        if (!member) return res.status(404).send({ error: `Member not found` });
        const channel = guild.channels.cache.get(options.channelID);
        if (!channel) return res.status(404).send({ error: `Channel not found` });
        const result = await member.voice.setChannel(channel as GuildVoiceChannelResolvable).catch(e => null);
        if (!result) return res.status(500).send({ error: `Failed to move member` });
        res.send({ success: true });
    },
} as WorkerAPIRoute