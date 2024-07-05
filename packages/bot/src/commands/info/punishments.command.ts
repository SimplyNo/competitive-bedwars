import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { Util } from "../../util/Util"
import moment from "moment";
moment.defineLocale('en-short-1', {
    relativeTime: {
        future: "in %s",
        past: "%s ago",
        s: '1 second',
        ss: '%d seconds',
        m: "1 minute",
        mm: "%d minutes",
        h: "1 hour",
        hh: "%d hours",
        d: "1 day",
        dd: "%d days",
        M: "1 month",
        MM: "%d months",
        y: "1 year",
        yy: "%d years"
    }
});
export default class PunishmentsCommand extends Command {
    constructor() {
        super({
            name: 'punishments',
            description: 'See your punishments',
            aliases: ['strikes', 'warns', 'accountstatus'],
            type: 'moderation'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        moment.locale('en-short-1');
        if (!verifiedConfig) return bot.createErrorEmbed(message).setDescription(`Only registered players can use this.`).send();
        const { mute, strikes, rankBan, punishmentHistory } = verifiedConfig.getUser()
        const pageNumber = parseInt(args[args.length - 1]);
        if (pageNumber) args.pop();
        if (!punishmentHistory.length && !strikes.length) return bot.createEmbed(message)
            .setTitle(`${verifiedConfig.username}'s Account Status`)
            .setDescription('You have no infractions!')
            .send();
        const lastInfraction = Math.max(punishmentHistory.slice(-1)?.[0]?.date, strikes.slice(-1)?.[0]?.date)
        const currentPunishment = [{ type: "rankBan", p: rankBan }, { type: 'mute', p: mute }].filter(e => e.p).sort((a, b) => (a.p?.end || 0) - (b.p?.end || 0)).map(({ type, p }) => {
            punishmentHistory.shift();
            return ({
                name: `Current Punishment (${type == 'rankBan' ? 'Competitive Ban' : 'Mute'})`,
                value: `
Issued: ${Util.getDiscordTimeFormat(p!.date, "D")}
Expires ${!p?.end ? 'Permanent' : Util.getDiscordTimeFormat(p!.end, "R")}
Reason: ${p?.reason || 'No reason provided'}`
            })
        })
        const strikeFields = strikes.map((s, i) => ({
            date: s.date,
            name: `Strike ${i + 1}`,
            value: `
Staff: <@${s.moderator}>
Issued: ${Util.getDiscordTimeFormat(s.date, "D")}
Reason: ${s.reason}`
        }))
        const banMuteFields = punishmentHistory.map((p, i) => ({
            date: p.date,
            name: `${p.type === 'mute' ? 'Mute' : 'Competitive Ban'} (${!p.time ? 'Permanent' : `${moment.duration(p.time).humanize()}`})`,
            value: `
Staff: <@${p.moderator}>
Issued: ${Util.getDiscordTimeFormat(p.date, "D")}
Expired: ${!p.end ? 'Permanent' : Util.getDiscordTimeFormat(p.end, "R")}
Reason: ${p.reason}`
        }))
        const pagefields = [...strikeFields, ...banMuteFields].sort((a, b) => b.date - a.date);
        const pages = Util.chunkArray(pagefields, 3).map((fields, i) => {
            return bot.createEmbed()
                .setTitle(`${verifiedConfig.username}'s Account Status`)
                .setDescription(!lastInfraction ? 'You currently have no active punishments!' : `Your last infraction was on ${Util.getDiscordTimeFormat(lastInfraction, 'D')}`)
                .addFields(i === 0 ? [...currentPunishment, ...fields] : fields)
                .setFooter({ text: `Page ${i + 1} of ${Math.ceil(pagefields.length / 3)} • Competitive Bedwars`, iconURL: `https://i.imgur.com/itMN1e0.png` });

        })
        let currentPage = pageNumber || 1;
        const generatePage = () => {
            return pages[currentPage - 1];
        }
        const msg = await message.reply({
            embeds: [
                generatePage()
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([
                        new ButtonBuilder()
                            .setCustomId(`left`)
                            .setEmoji('<:left:1252492539718799450>')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`right`)
                            .setEmoji('<:right:1252492780551409725>')
                            .setStyle(ButtonStyle.Secondary)
                    ])
            ]
        })
        msg.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            idle: 120000
        }).on('collect', (interaction) => {
            interaction.deferUpdate();
            if (interaction.customId === 'left') {
                currentPage--;
                if (currentPage < 1) currentPage = pages.length;
            }
            if (interaction.customId === 'right') {
                currentPage++;
                if (currentPage > pages.length) currentPage = 1;
            }
            msg.edit({
                embeds: [generatePage()]
            })
        })
            .on('end', () => {
                msg.edit({ components: [] }).catch(e => null);
            })
    }

}