import { getWorker } from "..";
import { BotToWorkerData, WorkerAPIRoute } from "../WorkerAPI";
import { mainServer } from "../../../../config.json";
export default {
    type: 'post',
    path: '/deletechannel',
    async execute(req, res) {
        const options = req.body as BotToWorkerData['deletechannel'];
        console.log(`/deletechannel:`, options)
        const worker = getWorker();
        const guild = worker.guilds.cache.get(mainServer);
        if (!guild) return res.status(404).send({ error: `Guild not found` });
        const channel = guild.channels.cache.get(options.channelID);
        if (!channel) return res.status(404).send({ error: `Channel not found` });
        const result = await channel.delete().catch(e => null);
        if (!result) return res.status(500).send({ error: `Failed to delete channel` });
        res.send({ success: true });
    },
} as WorkerAPIRoute