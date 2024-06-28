import { ActionRowBuilder, ButtonBuilder, ButtonStyle, InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
import { RankedGame } from "../../core/games/RankedGame";

export default class ResetCommand extends SlashCommand {
    constructor() {
        super({
            name: "reset",
            adminOnly: true,
            slash: new SlashCommandBuilder()
                .setName("reset")
                .setDescription("Completely reset stats of user.")
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The game ID to force score.')
                        .setRequired(true)
                )
        })
    }
    async run({ bot, interaction, serverConf, userConfig, verifiedConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse<boolean>> {
        const user = interaction.options.get('user')?.user;
        const verified = bot.getVerifiedUser({ id: user?.id });
        if (!verified) return interaction.reply({ content: `User not found/registered.`, ephemeral: true });
        const { bedsBroken, elo, gameHistory, highestStreak, losses, mvps, streak, voids, wins, } = verified.rbw;
        const confirmation = await interaction.reply({
            embeds: [
                bot.createEmbed()
                    .setTitle(`Stat Reset Confirmation`)
                    .setDescription(`Are you sure you want to reset stats for player **${verified.username}**?`)
                    .addFields([
                        {
                            name: 'Stats', value: `
• **Elo**: \`${elo.toLocaleString()}\`
• **Beds Broken**: \`${bedsBroken.toLocaleString()}\`
• **Games**: \`${gameHistory.length}\`
• **Wins**: \`${wins.toLocaleString()}\`
• **Losses**: \`${losses.toLocaleString()}\`
• **MVPs**: \`${mvps.toLocaleString()}\`
• **Streak**: \`${streak.toLocaleString()}\`
• **Highest Streak**: \`${highestStreak.toLocaleString()}\`
• **Voids**: \`${voids.toLocaleString()}\``
                        }
                    ])
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(new ButtonBuilder().setCustomId(`confirm`).setLabel(`Confirm Reset`).setStyle(ButtonStyle.Danger))
            ]
        })
        const confirm = await confirmation.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 60000 }).catch(e => null);
        if (!confirm) return confirmation.edit({ content: `Confirmation timed out.`, components: [] });
        verified.ranked()._resetStats();
        await verified.getUser().updateMember(true);
        confirmation.edit({ content: `Stats reset for **${verified.username}**.`, components: [] });
        return confirm.reply({
            embeds: [
                bot.createEmbed()
                    .setDescription(`Reset stats for **${verified.username}**.`)
            ]
        });
    }
}