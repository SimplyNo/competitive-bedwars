import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } from "discord.js";
import { CommandContext, Event } from "../../types";
import { Util } from "../../util/Util";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
import { UserConfig } from "../../types/config/UserConfig";
import { Bot } from "../../Bot";
const cooldowns = new Collection<string, Collection<string, number>>();

export default {
    name: "interactionCreate",
    once: false,
    async run(bot, interaction) {
        if (!interaction.isButton()) return;
        if (!interaction.inCachedGuild()) return;
        const [check, userID, action, isClosed] = interaction.customId.split("-");
        const voter = bot.getUser(interaction.user.id);
        if (check !== 'pugsvoting') return;
        if (isClosed) return;
        const pugsVote = voter.pugVotes?.[interaction.message.id];
        const user = bot.getUser(userID);
        console.log(voter.pugVotes);
        if (action === 'upvote') {
            voter.pugVotes = { ...voter.pugVotes, [interaction.message.id]: 'upvote' };
            voter.set({ pugVotes: voter.pugVotes });
            if (pugsVote === 'upvote') return interaction.reply({ content: `You already upvoted this.`, ephemeral: true });
            user.set({ pugUpvotes: (user.pugUpvotes || 0) + 1 });
            if (pugsVote === 'downvote') user.set({ pugDownvotes: user.pugDownvotes! - 1 });
            interaction.reply({ content: !pugsVote ? `Upvoted!` : `Vote switched to **upvote**!`, ephemeral: true });
            interaction.message.edit({
                embeds: [getPugsEmbed(bot, user)],
            })
        } else if (action === 'downvote') {
            if (pugsVote === 'downvote') return interaction.reply({ content: `You already downvoted this.`, ephemeral: true });
            voter.pugVotes = { ...voter.pugVotes, [interaction.message.id]: 'downvote' };
            voter.set({ pugVotes: voter.pugVotes });
            user.set({ pugDownvotes: (user.pugDownvotes || 0) + 1 });
            if (pugsVote === 'upvote') user.set({ pugUpvotes: user.pugUpvotes! - 1 });
            interaction.reply({ content: !pugsVote ? `Downvoted!` : `Vote switched to **downvote**!`, ephemeral: true });
            interaction.message.edit({
                embeds: [getPugsEmbed(bot, user)],
            })
        } else if (action === 'endvote') {
            if (interaction.member.roles.cache.has(bot.config.roles.pugsmanager)) {
                interaction.reply({ content: `Vote Ended!`, ephemeral: true });
                const { pugUpvotes, pugDownvotes } = user;
                interaction.message.edit(
                    {
                        embeds: [
                            getPugsEmbed(bot, user).setDescription(`<@${user.id}> has been **${pugUpvotes! > pugDownvotes! ? 'accepted' : 'denied'}** into PUGS.`)
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel(`Vote Ended`)
                                        .setStyle(ButtonStyle.Secondary)
                                        .setCustomId(`pugsvoting-${userID}-endvote`)
                                        .setDisabled(true)
                                )
                        ]
                    })
            } else {
                interaction.reply({
                    content: `You need <@&${bot.config.roles.pugsmanager}> role to do this.`,
                    ephemeral: true
                })
            }
        }

    }

} as Event<"interactionCreate">
export function getPugsEmbed(bot: Bot, user: UserConfig) {
    return bot.createEmbed()
        .setTitle(`${user.getVerified()?.username}'s Pugs Vote Request`)
        .addFields([
            {
                name: 'Upvotes:',
                value: `${user.pugUpvotes || 0}`,
                inline: true
            },
            {
                name: 'Downvotes:',
                value: `${user.pugDownvotes || 0}`,
                inline: true
            }
        ])
}