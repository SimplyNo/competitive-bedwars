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
        if (check !== 'pupsvoting') return;
        if (isClosed) return;
        const pupsVote = voter.pupVotes?.[interaction.message.id];
        const user = bot.getUser(userID);
        console.log(voter.pupVotes);
        if (action === 'upvote') {
            voter.pupVotes = { ...voter.pupVotes, [interaction.message.id]: 'upvote' };
            voter.set({ pupVotes: voter.pupVotes });
            if (pupsVote === 'upvote') return interaction.reply({ content: `You already upvoted this.`, ephemeral: true });
            user.set({ pupUpvotes: (user.pupUpvotes || 0) + 1 });
            if (pupsVote === 'downvote') user.set({ pupDownvotes: user.pupDownvotes! - 1 });
            interaction.reply({ content: !pupsVote ? `Upvoted!` : `Vote switched to **upvote**!`, ephemeral: true });
            interaction.message.edit({
                embeds: [getPupsEmbed(bot, user)],
            })
        } else if (action === 'downvote') {
            if (pupsVote === 'downvote') return interaction.reply({ content: `You already downvoted this.`, ephemeral: true });
            voter.pupVotes = { ...voter.pupVotes, [interaction.message.id]: 'downvote' };
            voter.set({ pupVotes: voter.pupVotes });
            user.set({ pupDownvotes: (user.pupDownvotes || 0) + 1 });
            if (pupsVote === 'upvote') user.set({ pupUpvotes: user.pupUpvotes! - 1 });
            interaction.reply({ content: !pupsVote ? `Downvoted!` : `Vote switched to **downvote**!`, ephemeral: true });
            interaction.message.edit({
                embeds: [getPupsEmbed(bot, user)],
            })
        } else if (action === 'endvote') {
            if (interaction.member.roles.cache.has(bot.config.roles.pupsManager)) {
                interaction.reply({ content: `Vote Ended!`, ephemeral: true });
                const { pupUpvotes, pupDownvotes } = user;
                interaction.message.edit(
                    {
                        embeds: [
                            getPupsEmbed(bot, user).setDescription(`<@${user.id}> has been **${pupUpvotes! > pupDownvotes! ? 'accepted' : 'denied'}** into PUPS.`)
                        ],
                        components: [
                            new ActionRowBuilder<ButtonBuilder>()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setLabel(`Vote Ended`)
                                        .setStyle(ButtonStyle.Secondary)
                                        .setCustomId(`pupsvoting-${userID}-endvote`)
                                        .setDisabled(true)
                                )
                        ]
                    })
            } else {
                interaction.reply({
                    content: `You need <@&${bot.config.roles.pupsManager}> role to do this.`,
                    ephemeral: true
                })
            }
        }

    }

} as Event<"interactionCreate">
export function getPupsEmbed(bot: Bot, user: UserConfig) {
    return bot.createEmbed()
        .setTitle(`${user.getVerified()?.username}'s PUPs Vote Request`)
        .addFields([
            {
                name: 'Upvotes:',
                value: `${user.pupUpvotes || 0}`,
                inline: true
            },
            {
                name: 'Downvotes:',
                value: `${user.pupDownvotes || 0}`,
                inline: true
            }
        ])
}