import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";

export default class ToggleRatingCommand extends Command {
    constructor() {
        super({
            name: 'togglerating',
            description: "Toggles rating in nickname",
            aliases: ['toggleelo'],
            cooldown: 5,
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!verifiedConfig) return bot.createErrorEmbed(message).setDescription(`You must be registered to use this command.`).send();
        if (!message.member?.roles.cache.has(bot.config.roles.eloToggle)) return bot.createErrorEmbed(message).setDescription(`You must have the <@&${bot.config.roles.eloToggle}> role to use this command.`).send();
        const toggled = verifiedConfig.showElo;
        verifiedConfig.set({ showElo: !toggled });
        verifiedConfig.getUser().updateMember(true);
        return bot.createSuccessEmbed(message).setDescription(`Rating in nickname has been **${!toggled ? 'enabled' : 'disabled'}**.`).send();

    }
}