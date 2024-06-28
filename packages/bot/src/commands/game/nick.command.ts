import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";

export default class NickCommand extends Command {
    constructor() {
        super({
            name: 'nick',
            aliases: ['nickname'],
            description: 'Change the nickname you are using to play ranked bedwars with.',
            usage: 'nick [nickname]',
            cooldown: 5
        })
    }
    async run({ args, bot, flags, message, prefix, serverConf, userConfig, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const nick = args.join(' ');
        if (nick.toLowerCase() === 'reset') {
            verifiedConfig?.set({ nick: undefined });
            await verifiedConfig?.getUser().updateMember(true);
            return bot.createEmbed(message).setDescription(`Your nickname has been reset.`).send();
        }
        if (!nick) return bot.createErrorEmbed(message).setDescription(`You must provide a nickname to use.`).send();
        if (nick.length > 16) return bot.createErrorEmbed(message).setDescription(`Nicknames must be 16 characters or less.`).send();
        const validChars = /^[a-zA-Z0-9_]+$/;
        if (!validChars.test(nick)) return bot.createErrorEmbed(message).setDescription(`Nicknames can only contain letters, numbers, and underscores.`).send();
        verifiedConfig?.set({ nick });
        await verifiedConfig?.getUser().updateMember(true);
        return bot.createSuccessEmbed(message)
            .setDescription(`Your nickname has been set to \`${nick}\`.\n\n`)
            .send()
    }
}