import { getWorker } from "..";
import { BotToWorkerData, WorkerAPIRoute } from "../WorkerAPI";
import { mainServer } from "../../../../config.json";
export default {
    type: 'post',
    path: '/createchannel',
    async execute(req, res) {
        const options = req.body as BotToWorkerData['createchannel'];
        console.log(`/createchannel:`, options)
        const worker = getWorker();
        const guild = worker.guilds.cache.get(mainServer);
        if (!guild) return res.status(404).send({ error: `Guild not found` });
        const result = await guild.channels.create(options).catch(e => null);
        if (!result) return res.status(500).send({ error: `Failed to create channel` });
        res.send({ success: true, channelID: result.id });
    },
} as WorkerAPIRoute