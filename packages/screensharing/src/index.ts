import { ActivityType, ChannelType, Client, GatewayIntentBits, MessageCreateOptions, Partials } from "discord.js";
import express from "express";
import { api, mainServer, screenshareToken } from "../../../config.json";
const bot = new Client({
    presence:
    {
        activities:
            [{
                name: "Competitive Bedwars",
                type: ActivityType.Watching
            }]
    },
    allowedMentions: {
        repliedUser: false,
        parse: ['users', 'roles']
    },
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [
    ],
    failIfNotExists: false
});
bot.login(screenshareToken);
bot.on('ready', () => {
    console.log(`Screen share connected!`);
})

const app = express();
app.use(express.json());
app.get('/', (req, res) => {
    res.send('ok');
});

app.post('/send', async (req, res) => {
    const { user, message } = req.body as { user: string, message: object };
    const guild = bot.guilds.cache.get(mainServer);
    if (!guild) return res.json({ success: false, error: "could not find guild" });
    const discUser = await bot.users.fetch(user).catch(e => console.error(e));
    if (!discUser) return res.json({ success: false, error: "could not find member" });
    console.log(discUser);
    const msg = await discUser.send(message as MessageCreateOptions).catch(e => null);
    if (!msg) return res.json({ success: false, error: "could not send message" });
    res.json({ success: true });
})
app.listen(api.ports.screensharing, () => {
    console.log(`Screensharing API listening at http://localhost:${api.ports.screensharing}`);
})