import { Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { cpuUsage, } from "os-utils";
export default class PingCommand extends Command {
    constructor() {
        super({
            name: 'ping',
            description: 'See info about the bot',
            type: 'info'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig: userConfig }: CommandContext): Promise<void | Message<boolean>> {
        const pingMsg = await message.reply('pinging...');
        const ping = pingMsg.createdTimestamp - message.createdTimestamp;

        let realMembers = (await message.guild.members.fetch()).filter(m => !m.user.bot).size;

        let memory = process.memoryUsage().heapUsed / 1024 / 1024;
        let allUsers = bot.getAllVerifiedUsers().length;
        pingMsg.edit({
            content: '',
            embeds: [

                bot.createEmbed()
                    .setTitle("Ranked Bedwars Bot Info")
                    .setThumbnail(`https://cdn.discordapp.com/icons/548487129869582349/91b56ca1e8b28b5ea1a13df451d65768.webp`)

                    .addFields([{
                        name: 'Bot Latency',
                        // value: `:hourglass_flowing_sand: \`${Math.abs(Date.now() - message.createdAt.getTime())}ms\``,
                        value: `:hourglass_flowing_sand: \`${ping}ms\` | \`${bot.ws.ping}ms\``,
                        inline: true
                    },
                    {
                        name: 'Uptime',
                        value: `⏰ <t:${Math.floor((Date.now() - bot.uptime!) / 1000)}:R>`,
                        inline: true
                    },
                    {
                        name: 'Bot Version',
                        value: `\`${bot.config.version}\``,
                        inline: true
                    },
                    {
                        name: 'Total Members',
                        value: `:busts_in_silhouette: \`${realMembers}\``,
                        inline: true
                    },
                    {
                        name: 'Registered Users',
                        value: `:white_check_mark: \`${allUsers}\``,
                        inline: true
                    }
                    ])
                    .setFooter({ text: `Developed by simplyno` })

            ]
        })
    }
}