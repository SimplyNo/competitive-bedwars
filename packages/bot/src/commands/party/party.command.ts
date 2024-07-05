import { APIActionRowComponent, APIActionRowComponentTypes, ActionRowBuilder, ActionRowData, ButtonBuilder, ButtonComponent, ButtonStyle, ComponentType, GuildMember, Message, VoiceChannel } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Bot } from "../../Bot";
import { VerifiedConfig } from "../../types/config/VerifiedConfig";
import { Party } from "../../core/party/Party";
import { Util } from "../../util/Util";
import moment from "moment";
moment.defineLocale('en-short', {
    relativeTime: {
        future: "in %s",
        past: "%s ago",
        s: '<1m',
        ss: '%ds',
        m: "1m",
        mm: "%dm",
        h: "1h",
        hh: "%dh",
        d: "1d",
        dd: "%dd",
        M: "1M",
        MM: "%dM",
        y: "1Y",
        yy: "%dY"
    }
});


type PartyCommandData = {
    bot: Bot;
    message: Message<true>;
    verifiedConfig: VerifiedConfig;
    party: Party | undefined;
    subcommand: string;
    isLeader: boolean;
    targetMember: GuildMember | null | undefined;
};

export default class PartyCommand extends Command {
    constructor() {
        super({
            name: 'party',
            aliases: ['p'],
            description: 'Create a party and invite players to join.',
            type: 'party',
            subcommands: [
                { usage: "kick <player>", description: "(Party Leader) Kicks a player from the party" },
                { usage: "disband", description: "(Party Leader) Disbands the party" },
                { usage: "autowarp", description: "(Party Leader) Toggles auto warp on and off" },
                { usage: "warp", description: "(Party Leader) Warps all party members to current channel." },
                { usage: "list", description: "Lists the players in the party" },
                { usage: "accept <player?>", description: "Accepts the party invite" },
                { usage: "leave", description: "Leaves the party" },
                { usage: "invites", description: "Lists the invites in the party" },
                { usage: "invite <player>", description: "Invites a player to the party" }
            ]
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig, userConfig }: CommandContext): Promise<void | Message<boolean>> {
        if (!serverConf.isQueueOpen()) return bot.createErrorEmbed(message).setDescription(`The queue is currently closed.`).send();
        moment.locale('en-short');
        if (!verifiedConfig) return bot.createErrorEmbed(message).setDescription(`You must be registered to use this command.`).send();
        let party = bot.partyManager.getPartyByMember(verifiedConfig.id);
        let isLeader = party?.leader.id === verifiedConfig.id;
        const subcommand = args.shift()?.toLowerCase();
        const game = bot.rankedManager.getGameByTextChannel(message.channel.id);

        if (!subcommand && !game) return bot.createErrorEmbed(message).setTitle(`Party System`).setDescription(`Use one of these subcommands: ${['kick', 'disband', 'autowarp', 'list', 'accept', 'leave', 'invites', 'warp', 'invite'].map(c => `\`${c}\``).join(', ')}`).send();
        if (!subcommand) return;
        const targetMember = await bot.parseMember(args.slice(0).join(' '), message.guild);

        if (['kick'].includes(subcommand)) {
            PartyCommand.handlePartyKick({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });
        } else if (['disband', 'dissband'].includes(subcommand)) {
            PartyCommand.handlePartyDisband({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });
        } else if (['autowarp', 'autowapr', 'autwapr'].includes(subcommand)) {
            PartyCommand.handlePartyAutowarp({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });
        } else if (['list', 'lsit'].includes(subcommand)) {
            const target = targetMember || message.member;
            const verified = bot.getVerifiedUser({ id: target!.id });
            if (!verified) return bot.createErrorEmbed(message).setDescription(`<@${targetMember?.id}> is not registered.`).send();
            const p = bot.partyManager.getPartyByMember(targetMember?.id || verifiedConfig.id);
            PartyCommand.handlePartyList({ bot, message, verifiedConfig: verified!, party: p, subcommand, isLeader, targetMember: target });
        } else if (['accept', 'a'].includes(subcommand)) {
            PartyCommand.handlePartyAccept({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });
        } else if (['leave', 'l'].includes(subcommand)) {
            PartyCommand.handlePartyLeave({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });
        } else if (['invites', 'i'].includes(subcommand)) {
            PartyCommand.handlePartyInvites({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });
            // } else if (['transfer'].includes(subcommand)) {
            //     PartyCommand.handlePartyTransfer({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });
        } else if (['warp', 'wapr', 'wrap'].includes(subcommand)) {
            PartyCommand.handlePartyWarp({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });

        } else if (['invite'].includes(subcommand)) {
            PartyCommand.handlePartyInvite({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember });
        } else if (!game && await bot.parseMember(subcommand, message.guild)) {
            PartyCommand.handlePartyInvite({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember: await bot.parseMember([subcommand, ...args.slice(0)].join(' '), message.guild) });
        } else if (!game) {
            return bot.createErrorEmbed(message)
                .setTitle(`Invalid Party Command`)
                .setDescription(`Invalid subcommand (or user to invite), \`${subcommand}\`. \n\nUse \`=help party\` to see available subcommands.`).send();
        }
    }
    static async handlePartyWarp({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember }: PartyCommandData) {
        if (!party) return bot.createErrorEmbed(message).setDescription(`You are not in a party.`).send();
        if (!isLeader) return bot.createErrorEmbed(message).setDescription(`You must be the party leader to warp the party.`).send();
        const channel = message.member?.voice.channel;
        if (!channel) return bot.createErrorEmbed(message).setDescription(`You must be in a voice channel to warp the party.`).send();
        party.warp(message.member.id, channel as VoiceChannel);
        return bot.createSuccessEmbed(message).setDescription(`You have warped the party to ${channel}.`).send();
    }
    static async handlePartyTransfer({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember }: PartyCommandData) {
        if (!party) return bot.createErrorEmbed(message).setDescription(`You are not in a party.`).send();
        if (!targetMember) return bot.createErrorEmbed(message).setDescription(`You must specify a user to transfer the party to.`).send();
        if (!isLeader) return bot.createErrorEmbed(message).setDescription(`You must be the party leader to transfer the party.`).send();
        if (targetMember.id === verifiedConfig.id) return bot.createErrorEmbed(message).setDescription(`You can't transfer the party to yourself!`).send();
        const newLeader = party.getMember(targetMember.id);
        if (!newLeader) return bot.createErrorEmbed(message).setDescription(`<@${targetMember.id}> is not in the party.`).send();
        party.setLeader(newLeader);
        return bot.createSuccessEmbed(message).setDescription(`You have transferred the party leadership to <@${newLeader.id}>.`).send();
    }
    static async handlePartyKick({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember }: PartyCommandData) {
        if (!party) return bot.createErrorEmbed(message).setDescription(`You are not in a party.`).send();
        if (!isLeader) return bot.createErrorEmbed(message).setDescription(`You must be the party leader to kick players.`).send();
        if (!targetMember) return bot.createErrorEmbed(message).setDescription(`You must specify a user to kick.`).send();
        if (targetMember.id === verifiedConfig.id) return bot.createErrorEmbed(message).setDescription(`You can't kick yourself!`).send();
        const memberToKick = party.getMember(targetMember.id);
        if (!memberToKick) return bot.createErrorEmbed(message).setDescription(`<@${targetMember.id}> is not in the party.`).send();
        party.removeMember(memberToKick);
        return bot.createSuccessEmbed(message).setDescription(`You have kicked <@${targetMember.id}> from the party.`).send();
    }
    static async handlePartyDisband({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember }: PartyCommandData) {
        if (!party) return bot.createErrorEmbed(message).setDescription(`You are not in a party.`).send();
        if (!isLeader) return bot.createErrorEmbed(message).setDescription(`You must be the party leader to disband the party.`).send();
        party.disband();
        return bot.createSuccessEmbed(message).setDescription(`You have disbanded the party.`).send();
    }
    static async handlePartyAutowarp({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember }: PartyCommandData) {
        if (!party) return bot.createErrorEmbed(message).setDescription(`You are not in a party.`).send();
        if (!isLeader) return bot.createErrorEmbed(message).setDescription(`You must be the party leader to toggle autowarp.`).send();
        party.setAutowarp(!party.autowarp);
        if (party.autowarp) {
            const channel = message.member?.voice.channel;
            if (channel) party.warp(message.member.id, channel as VoiceChannel);
        }
        return bot.createSuccessEmbed(message).setDescription(`Autowarp has been \`${party.autowarp ? 'ENABLED' : 'DISABLED'}\`.`).send();
    }
    static async handlePartyList({ bot, message, party, verifiedConfig, targetMember }: PartyCommandData) {
        if (!party) return bot.createErrorEmbed(message).setDescription(`<@${targetMember?.id}> is not in a party.`).send();
        const members = party.members.map(m => `<@${m.id}>`).join('\n');
        return bot.createEmbed(message)
            .setTitle(`${Util.capitalizeFirstLetter(party.leader.username || 'Unknown User')}'s Party`)
            .setDescription(`
**Created**: ${Util.getDiscordTimeFormat(party.created, "R")}
**Autowarp**: ${party.autowarp ? 'On' : 'Off'}
**Status**: ${party.members.every(member => bot.matchMaking.isInQueue(member)) ? `In Queue (${Util.formatDuration((Date.now() - bot.matchMaking.groupsInQueue.get(party.leader.id)?.queueStart!))})` : !party.inactiveSince ? `Active` : `Inactive`}
`)
            .addFields([
                {
                    name: `Members (${party.members.length}/2)`,
                    value: `${party.members.map(m => `• <@${m.id}> ${party.leader.id === m.id ? 'Leader' : ''}`).join('\n')}`
                }
            ]).send()

    }
    static async handlePartyAccept({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember }: PartyCommandData) {
        if (!targetMember) {
            const invites = bot.partyManager.getPartyByInvite(verifiedConfig.id) || [];
            if (invites.length == 0) {
                return bot.createErrorEmbed(message).setDescription(`You have no pending party invites.`).send();
            } else if (invites.length === 1) {
                targetMember = await bot.parseMember(invites[0].leader.id, message.guild);
            } else {
                return bot.createErrorEmbed(message).setDescription(`You have multiple pending party invites. Please specify the user you want to accept the invite from.`).send();
            }
        }
        if (!targetMember) {
            console.log(`asadjfdosf:`, bot.partyManager.getPartyByInvite(verifiedConfig.id));
            return bot.createErrorEmbed(message).setDescription(`Failed to parse member.`).send();
        }
        const partyToJoin = bot.partyManager.getPartyByLeader(targetMember.id);
        if (partyToJoin?.leader.id === party?.leader.id) return bot.createErrorEmbed(message).setDescription(`You are already in the party!`).send();
        if (party) return bot.createErrorEmbed(message).setDescription(`Leave your current party first before joining a new one.`).send();
        if (!partyToJoin) return bot.createErrorEmbed(message).setDescription(`That party no longer exists.`).send();
        if (partyToJoin.isFull()) return bot.createErrorEmbed(message).setDescription(`That party is full.`).send();
        partyToJoin.addMember(verifiedConfig);
        return bot.createSuccessEmbed(message).setDescription(`You have joined <@${partyToJoin.leader.id}>'s party!`).send();
    }
    static async handlePartyInvites({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember }: PartyCommandData) {
        const invites = bot.partyManager.getPartyByInvite(verifiedConfig.id) || [];
        return bot.createEmbed(message).addFields([
            { name: `Pending Invites (${invites.length})`, value: invites.map(p => `\`•\` <@${p.leader.id}>'s Party (${p.members.length} members)`).join('\n') || 'You have no pending invites!' }
        ]).send()
    }
    static async handlePartyLeave({ bot, message, verifiedConfig, party, subcommand, isLeader }: PartyCommandData) {
        if (!party) return bot.createErrorEmbed(message).setDescription(`You are not in a party.`).send();
        if (isLeader) {
            party.disband();
            return bot.createSuccessEmbed(message).setDescription(`You left, and the party was disbanded.`).send();
            // if (party.members.length <= 1) {
            // } else {
            //     return bot.createErrorEmbed(message).setDescription(`You are the party leader. Transfer the party to someone else using \`=p transfer @User\` first before leaving, or use \`=p disband\` to disband the party. `).send()
            // }
        } else {
            party.removeMember(verifiedConfig);
            return bot.createSuccessEmbed(message).setDescription(`You have left <@${party.leader.id}>'s party.`).send();
        }
    }
    static async handlePartyInvite({ bot, message, verifiedConfig, party, subcommand, isLeader, targetMember }: PartyCommandData) {
        party = party || bot.partyManager.createParty(verifiedConfig);
        isLeader = party.leader.id === verifiedConfig.id;
        if (!party) return bot.createErrorEmbed(message).setDescription(`An error occurred while creating the party. (no_existing_party)`).send();
        if (!targetMember) return bot.createErrorEmbed(message).setDescription(`You must specify a user to invite.`).send();
        const targetUser = bot.getUser(targetMember.id);
        if (targetUser.ignoreList?.includes(verifiedConfig.id)) return bot.createErrorEmbed(message).setDescription(`${targetMember} has you on their ignore list, they will have to invite you to a party.`).send()
        const registeredtargetMember = bot.getVerifiedUser({ id: targetMember.id });
        if (targetMember.id === verifiedConfig.id) return bot.createErrorEmbed(message).setDescription(`You can't invite yourself!`).send();
        if (party.isFull()) return bot.createErrorEmbed(message).setDescription(`The party is full!`).send();
        if (!registeredtargetMember) return bot.createErrorEmbed(message).setDescription(`${targetMember} is not registered.`).send();
        if (party.getMember(targetMember.id)) return bot.createErrorEmbed(message).setDescription(`${targetMember} is already in the party!`).send();
        if (party.invites.has(targetMember.id)) return bot.createErrorEmbed(message).setDescription(`${targetMember} has already been invited!`).send();
        if (!isLeader) return bot.createErrorEmbed(message).setDescription(`You must be the party leader to invite players.`).send();

        party.invite(targetMember.id);
        const msg = await message.reply({
            content: `<@${targetMember.id}>`,
            embeds: [
                bot.createSuccessEmbed().setDescription(`**${message.member} invited you to join their party!**\n\nYou have **60s** to accept by clicking the button or using **=p accept ${message.member}**.`)
            ],
            components: [
                {
                    type: ComponentType.ActionRow, components: [
                        new ButtonBuilder().setCustomId('party_accept').setLabel(`Accept`).setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('party_decline').setLabel(`Decline`).setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('party_ignore').setLabel(`Ignore Future Invites`).setStyle(ButtonStyle.Secondary),
                    ]
                }]
        })
        const expireTimeout = setTimeout(() => {
            if (party.invites.has(targetMember.id)) {
                party.invites.delete(targetMember.id);
                msg.edit({
                    components: [{ type: ComponentType.ActionRow, components: [new ButtonBuilder().setCustomId('expire').setDisabled(true).setStyle(ButtonStyle.Secondary).setLabel(`Invite Expired`)] }]
                }).catch(e => null)
                return message.reply({
                    content: `<@${targetMember.id}>`,
                    embeds: [
                        bot.createErrorEmbed().setDescription(`**${message.member}'s party invitation has expired.**`)
                    ]
                }).catch(e => null)
            }
        }, 60000);
        msg.createMessageComponentCollector({ time: 60000, filter: (i => ['party_accept', 'party_decline', 'party_ignore'].includes(i.customId)) }).on('collect', async (interaction) => {
            clearTimeout(expireTimeout);
            const { user, customId } = interaction;
            if (user.id !== targetMember.id) return;
            if (!party) return console.error(`!!!! COULD NOT HANDLE PARTY ACCEPT/DENY/IGNORE: Party not found?.`);
            let newComponents: ActionRowBuilder<ButtonBuilder>[] = [];
            const currentParty = bot.partyManager.getPartyByMember(targetMember.id);
            if (customId === 'party_accept') {
                party.invites.delete(targetMember.id);
                if (party.isFull()) bot.createErrorEmbed(interaction).setDescription(`That party is full!`).send()
                else if (currentParty?.leader.id === party.leader.id) bot.createErrorEmbed(interaction).setDescription(`You are already in this party!`).send();
                else if (currentParty) bot.createErrorEmbed(interaction).setDescription(`You are already in a party!`).send();
                else if (!party.exists()) {
                    console.log(`party in question:`, party)
                    bot.createErrorEmbed(interaction).setDescription(`That party no longer exists.`).send();
                } else {
                    interaction.deferUpdate();
                    party.addMember(registeredtargetMember);
                    await bot.createSuccessEmbed(message).setDescription(`You have joined **${message.member}'s party**!`).send();
                    newComponents = [new ActionRowBuilder({ type: ComponentType.ActionRow, components: [new ButtonBuilder().setCustomId('party_accept').setDisabled(true).setStyle(ButtonStyle.Success).setLabel(`Accepted`)] })]
                }
            } else if (customId === 'party_decline') {

            } else if (customId === 'party_ignore') {
                if (!targetUser.ignoreList) targetUser.ignoreList = [];
                targetUser.set({ ignoreList: targetUser.ignoreList.concat(verifiedConfig.id) });
                interaction.reply({
                    content: `Added ${message.member} to your ignore list. You can configure your ignore list with \`=ignore\`.`,
                    ephemeral: true
                })
            }
            msg.edit({
                components: newComponents
            })

        })
    }
}
