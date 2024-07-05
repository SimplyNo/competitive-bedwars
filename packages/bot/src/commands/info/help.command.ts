import { Message } from "discord.js";
import { Command, CommandContext, realNames } from "../../types";

export default class HelpCommand extends Command {
    constructor() {
        super({
            name: 'help',
            description: 'Displays all available commands',
            type: 'info',
            aliases: ['h'],
            usage: 'help <command>',

        });
    }
    async run({ message, args, bot, serverConf, prefix }: CommandContext): Promise<void | Message> {
        if (!args.length) {
            let types = new Map();
            const isStaff = message.member?.permissions.has('Administrator');
            bot.commands.forEach(el => {
                if ((el.adminOnly || el.devOnly) && !isStaff) return;
                types.set(el.type || "misc", types.get(el.type || "misc") ? types.get(el.type || "misc").concat(el) : [el]);
            })

            let embed = bot.createEmbed(message).setTitle(`Competitive Bedwars Bot — Commands`).setGuildFancy(message.guild);
            types.forEach((commands, type) => {
                let msg = "";
                let keys = (commands.map(el => el.name)).sort((a, b) => {
                    if (a > b) return 0
                    if (a < b) return -1
                    return 0
                });

                /**
                 * @todo alphabetical order
                 */
                msg = keys.map(key => commands.find(el => el.name == key).name).join(', ');

                // keys.forEach(key => {
                //     let cmd = commands.find(el => el.name == key); // \u2009
                //     msg += `\`${cmd.name}\``
                // })
                console.log(type)
                embed.addFields({ name: `${realNames[type].name}`, value: msg });
            })
            embed.setFooter({ text: `Use ${prefix}help <command> for specific command information` }).send()
        } else {
            let commandName = args[0];
            let command =
                bot.commands.get(commandName) ||
                bot.commands.find(
                    cmd => !!(cmd.aliases && cmd.aliases.includes(commandName))
                );
            if (!command)
                return message.channel.send({
                    embeds: [
                        bot
                            .createErrorEmbed()
                            .setTitle("Unknown Command!")
                            .setDescription("This command does not exist.")
                    ]
                }
                );
            console.log(command);
            return message.channel.send({
                embeds: [

                    bot.createEmbed()
                        .setTitle(`Command: ${command.name}`)
                        .setDescription(`${command.description}` || "No description provided")
                        .addFields({
                            name: "Usage",
                            value: `\`${prefix}${command.name} ${command.usage || ""}\``,
                            inline: true
                        },
                            {
                                name: "Aliases",
                                value: command.aliases ? `\`${command.aliases.join("`, `")}\`` : "None",
                                inline: true
                            },
                            {
                                name: "Type",
                                value: realNames[command.type || "misc"].name,
                                inline: true
                            },
                            {
                                name: "Subcommands",
                                value: command.subcommands?.map(cmd => `\`=${command.name} ${cmd.usage}\` — **${cmd.description}**`).join("\n") || "None",
                            },
                        )
                ]
            }


            );
        }


    }
}
