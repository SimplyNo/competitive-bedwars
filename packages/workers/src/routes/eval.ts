import { BotToWorkerData, WorkerAPIRoute } from "../WorkerAPI";

export default {
    type: 'post',
    path: '/eval',
    async execute(req, res) {
        const { data } = req.body as BotToWorkerData['eval'];
        let result: any;
        try {
            console.log(`eval:`, data)
            result = await eval(data);
            res.send({ result: String(result) });
        } catch (e) {
            console.error(`eval error`, e);
            return res.status(500).send({ error: e.message });
        }
    },
} as WorkerAPIRoute