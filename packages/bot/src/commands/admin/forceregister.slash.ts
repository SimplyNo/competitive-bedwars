import { Message, SlashCommandBuilder } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import { Wrappers } from "../../wrappers/Wrappers";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class ForceRegisterCommand extends SlashCommand {
    constructor() {
        super({
            name: 'forceregister',
            slash: new SlashCommandBuilder()
                .setName('forceregister')
                .setDescription('Force register a user.')
                .addUserOption(option => option.setName('user').setDescription('The user to force register.').setRequired(true))
                .addStringOption(option => option.setName('username').setDescription('The username to force register the user as.').setRequired(true)),
            type: 'admin',
            adminOnly: true,
            usage: '<user>',
            aliases: ['fv', 'forceverify']
        })
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean>> {
        const discordMember = interaction.options.get('user')!.member!;
        const username = interaction.options.get('username')!.value! as string;

        if (!discordMember) return bot.createErrorEmbed(interaction).setDescription(`\`${discordMember}\` is not a valid user!`).send();
        const existingUser = bot.getVerifiedUser({ id: discordMember.id });
        if (existingUser) return bot.createErrorEmbed(interaction).setDescription(`${discordMember.user} is already verified as **${existingUser.username}**! Force unregister them first.`).send();
        const hypixelData = await Wrappers.hypixel.player(username);

        if (!hypixelData || hypixelData.outage) return bot.createErrorEmbed(interaction).setDescription(`\`${username}\` is not a valid username!`).send();
        const { uuid, displayname, emojiRank } = hypixelData;

        bot.addVerifiedUser(discordMember.id, uuid, displayname, emojiRank);
        bot.logger.log(bot.config.channels.verificationLogs, {
            embeds: [bot.createEmbed().setAuthor({ name: `User Force Verified!`, iconURL: interaction.user.avatarURL()! }).setFooter({ text: `UUID: ${uuid}` })
                .setDescription(`<@${discordMember.id}> (\`${Number(discordMember.user.discriminator) ? discordMember.user.tag : discordMember.user.username}\`) was successfully force verified as ${emojiRank} **${displayname}** by ${interaction.user}!`).setThumbnail(Util.genHeadImage(uuid))]
        })

        return bot.createEmbed(interaction)
            .setDescription(`Successfully verified ${discordMember} as ${emojiRank} **${displayname}**!`)
            .setFooter({ text: `UUID: ${uuid}` })
            .send()
    }
}