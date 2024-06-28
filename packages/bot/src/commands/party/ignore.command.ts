import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";

export default class IgnoreCommand extends Command {
    constructor() {
        super({
            name: 'ignore',
            aliases: ['ignorelist'],
            description: `Manage players on your ignore list`
        })
    }
    async run({ args, bot, flags, message, prefix, serverConf, userConfig, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const ignoreList = userConfig.ignoreList || [];
        if (!args.length) {
            return bot.createEmbed(message)
                .setTitle(`Current Ignore List`)
                .setDescription(`Use \`=ignore [User]\` to ignore someone.\nUse \`=ignore remove [User]\` to remove someone from the list.`)
                .addFields([
                    { name: `Ignored Players (${ignoreList.length})`, value: `${ignoreList.reverse().map(u => `<@${u}>`).join(', ') || 'You have no ignored players!'}` }
                ])
                .send()
        }
        if (args[0] === 'remove') {
            const user = await bot.parseMember(args.slice(1).join(' '), message.guild);
            if (!user) return bot.createErrorEmbed(message).setDescription(`User \`${args.slice(1).join(' ')}\`not found.`).send();
            if (!ignoreList.includes(user.id)) return bot.createErrorEmbed(message).setDescription(`This person is not on your ignore list.`).send();
            ignoreList.splice(ignoreList.indexOf(user.id), 1);
            userConfig.set({ ignoreList });
            return bot.createEmbed(message).setDescription(`${user} was removed from ignore list.`).send();
        } else {
            const userToIgnore = await bot.parseMember(args[args.length - 1], message.guild);
            if (!userToIgnore) return bot.createErrorEmbed(message).setDescription(`User \`${args[args.length - 1]}\` not found.`).send();
            if (ignoreList.includes(userToIgnore.id)) return bot.createErrorEmbed(message).setDescription(`This person is already on your ignore list.`).send();
            ignoreList.push(userToIgnore.id);
            userConfig.set({ ignoreList });
            return bot.createEmbed(message).setDescription(`${userToIgnore} was added to ignore list.`).send();
        }
    }
}