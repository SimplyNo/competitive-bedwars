import { Client, Collection } from 'discord.js';
import { workers } from '../../../config.json';
import { WorkerAPI } from './WorkerAPI';
console.log('Competitive Bedwars | Worker Bots')

export const API = new WorkerAPI();
API.listen();
export const WorkerBots: Collection<string, Client> = new Collection();

for (const worker of workers) {
    const bot = new Client({
        intents: ['Guilds', 'GuildModeration']
    });
    bot.login(worker);
    bot.on('ready', ({ user }) => {
        console.log(`Worker ${user.tag} is ready!`);
    })
    WorkerBots.set(worker, bot);
}
let currentWorkerID = 0;
export const getWorker = () => {
    if (currentWorkerID >= WorkerBots.size) currentWorkerID = 0;
    console.log(`using worker #${currentWorkerID}`)
    const worker = [...WorkerBots.values()][currentWorkerID];
    currentWorkerID++;
    return worker;
}