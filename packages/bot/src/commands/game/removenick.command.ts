import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";

export default class RemoveNickCommand extends Command {
    constructor() {
        super({
            name: 'removenick',
            aliases: ['rn', 'resetnick', 'nr'],
            description: 'Reset nickname.',
            usage: '<nickname>',
            cooldown: 5,
            type: 'game'
        })
    }
    async run({ args, bot, flags, message, prefix, serverConf, userConfig, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        verifiedConfig?.set({ nick: undefined });
        await verifiedConfig?.getUser().updateMember(true);
        return bot.createEmbed(message).setDescription(`Your nickname has been reset.`).send();
    }
}