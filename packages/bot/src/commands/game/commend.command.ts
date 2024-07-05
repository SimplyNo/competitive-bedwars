import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";

export default class CommendCommand extends Command {
    constructor() {
        super({
            name: 'commend',
            description: 'Commend a player.',
            usage: '<player>',
            type: 'game'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        if ((verifiedConfig?.commendsToGive || 0) <= 0) return bot.createErrorEmbed(message).setDescription(`You have no more commends left to give!`).send();
        if (!args.length) return bot.createErrorEmbed(message).setDescription(`You must include a user to commend.`).send();
        const user = await bot.parseMember(args[0], message.guild!);
        if (!user) return bot.createErrorEmbed(message).setDescription(`Failed to parse member \`${args[0]}\`.`).send()
        if (user.id === message.author.id) return bot.createErrorEmbed(message).setDescription(`You cannot commend yourself.`).send();
        const verified = bot.getVerifiedUser({ id: user.id });
        if (!verified) return bot.createErrorEmbed(message).setDescription(`This user is not registered.`).send();
        verified.ranked().addCommend();
        verifiedConfig?.set({ commendsToGive: verifiedConfig.commendsToGive - 1 });
        const embed = bot.createEmbed(message)
            .setTitle(`Player Commended`)
            .setDescription(`${user} was commended by ${message.author}. They now have \`${verified.ranked().getStat('commends')}\` commends.\n\n${message.author} has \`${verifiedConfig?.commendsToGive}\` commends left to give.`)
            .send()
    }
}