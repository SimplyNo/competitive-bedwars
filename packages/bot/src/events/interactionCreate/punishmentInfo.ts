import { Collection, EmbedField } from "discord.js";
import { CommandContext, Event } from "../../types";
import { Util } from "../../util/Util";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
const cooldowns = new Collection<string, Collection<string, number>>();

export default {
    name: "interactionCreate",
    once: false,
    async run(bot, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.inCachedGuild()) return;
        if (interaction.guild.id !== bot.mainGuild) return;

        if (interaction.customId !== 'punishment-info') return;
        const userConfig = bot.getUser(interaction.user.id);

        const punishments: string[] = [];
        if (userConfig.ban) {
            const moderator = bot.getUser(userConfig.ban.moderator);
            punishments.push(`**Type of Punishment**: \`Server Ban\`
**Issued By**: <@${moderator.id}> \`(${moderator.username})\`
**Length**: \`${userConfig.ban.time ? Util.getDateString(userConfig.ban.time) : 'Permanent'}\`
**Expires**: ${userConfig.ban.end ? `${Util.getDiscordTimeFormat(userConfig.ban.end, 'R')}` : `\`Never\``}
**Reason**: \`${userConfig.ban.reason}\` 
`)
        }
        if (userConfig.mute) {
            const moderator = bot.getUser(userConfig.mute.moderator);
            punishments.push(`**Type of Punishment**: \`Mute\`
**Issued By**: <@${moderator.id}> \`(${moderator.username})\`
**Length**: \`${userConfig.mute.time ? Util.getDateString(userConfig.mute.time) : 'Permanent'}\`
**Expires**: ${userConfig.mute.end ? `${Util.getDiscordTimeFormat(userConfig.mute.end, 'R')}` : `\`Never\``}
**Reason**: \`${userConfig.mute.reason}\` 
`)
        }
        interaction.reply({
            ephemeral: true, embeds: [bot.createEmbed()
                .setTitle(`Punishment Details`)
                .setDescription(punishments.join('\n') || `No punishments found.`)
                .setColor('Red')
                .setFooter({ text: `Make a ticket to appeal a punishment or buy a pardon from the store.` })]
        })
    }

} as Event<"interactionCreate">