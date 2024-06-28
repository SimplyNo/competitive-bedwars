import { Message, SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class ForceUnregisterCommand extends SlashCommand {
    constructor() {
        super({
            name: 'forceunregister',
            slash: new SlashCommandBuilder()
                .setName('forceunregister')
                .setDescription('Force unregister a user.')
                .addUserOption(option => option.setName('user').setDescription('The user to force unregister.').setRequired(true)),
            type: 'admin',
            adminOnly: true,
            usage: '<user>',
            aliases: ['fu', 'fuv', 'forceunverify']
        })
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        const discordMember = interaction.options.get('user')!.member!;
        if (!discordMember) return bot.createErrorEmbed(interaction).setDescription(`\`${discordMember}\` is not a valid user!`).send();
        const existingUser = bot.getVerifiedUser({ id: discordMember.id });
        if (!existingUser) return bot.createErrorEmbed(interaction).setDescription(`${discordMember.user} is not registered!`).send();
        bot.removeVerifiedUser({ id: discordMember.id });
        bot.logger.log(bot.config.channels.verificationLogs, { embeds: [bot.createEmbed().setAuthor({ name: `User Force Unregistered!`, iconURL: interaction.user.avatarURL()! }).setDescription(`<@${discordMember.id}> (\`${Number(discordMember.user.discriminator) ? discordMember.user.tag : discordMember.user.username}\`) was successfully force unverified as ${existingUser.emojiRank} **${existingUser.username}** by ${interaction.user}!`).setThumbnail(Util.genHeadImage(existingUser.uuid))] })
        return bot.createEmbed(interaction).setDescription(`Successfully unregistered ${discordMember}! (Previously registered as **${existingUser.username}**)`).send();
    }
}