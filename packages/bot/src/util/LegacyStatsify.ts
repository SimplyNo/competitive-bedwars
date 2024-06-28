import chalk from 'chalk';
import { APIEmbedField, Embed, EmbedBuilder } from 'discord.js';
import assets from '../../../../assets/assets.json';
import config from '../../../../config.json';
const color = "#2A9DF4";

export function sendPages(message, embeds: any = [], page = 1, time) {
    if (!message.channel.permissionsFor(message.guild.members.me).has(['SEND_MESSAGES', "ADD_REACTIONS", "MANAGE_MESSAGES", "ATTACH_FILES"])) {
        console.log(chalk.red(`[INVITE ERR] ${message.guild.name} invited the bot with missing perms`))
        return message.channel.send(`${assets.error} Bot has been added with the incorrect permissions. Please **reinvite** with administrator **OR** you can assign the following permissions:\n\n\`+\` **SEND_MESSAGES**\n\`+\` **ADD_REACTIONS**\n\`+\` **MANAGE_MESSAGES**\n\`+\` **ATTACH_FILES**`).catch(e => {
            console.log(chalk.red(`[INVITE ERR] ${message.guild.name} could not send invite error message.`))
        })
    }

    if (embeds.length == 1) return message.channel.send({ embeds: [embeds[0]], files: embeds[0].files })

    message.channel.send({ embeds: [embeds[page - 1]], files: embeds[0].files }).then(msg => {
        msg.react("<:backward:805252099892838411>").then(r => {
            msg.react("<:forward:805252099910795285>").then(msg.react("<:stop:805252099867803678>"));

            const stopFilter = (reaction, user) => reaction.emoji.name === "stop" && user.id == message.author.id;
            const backwardsFilter = (reaction, user) => reaction.emoji.name === "backward" && user.id == message.author.id;
            const forwardsFilter = (reaction, user) => reaction.emoji.name === "forward" && user.id == message.author.id;

            const backwards = msg.createReactionCollector({ filter: backwardsFilter, time });
            const forwards = msg.createReactionCollector({ filter: forwardsFilter, time });
            const stop = msg.createReactionCollector({ filter: stopFilter, time });

            stop.on("collect", r => msg.reactions.removeAll());
            stop.on("end", r => msg.reactions.removeAll().catch(e => { }));

            forwards.on("collect", r => {
                if (page === embeds.length) page = 1;
                else page++;
                msg.edit({ embeds: [embeds[page - 1]] });
                r.users.remove(message.author.id)
            });

            backwards.on("collect", r => {
                if (page === 1) page = embeds.length;
                else page--
                msg.edit({ embeds: [embeds[page - 1]] });
                r.users.remove(message.author.id)
            });

        });
    });
}
export function pageEmbedMaker(embed: any = {}, pages: any = []) {
    let embeds: any = []
    embed = {
        title: null,
        icon: undefined,
        color: color,
        url: false,
        footer: true,
        description: null,
        image: false,
        thumbnail: false,
        files: false,
        ...embed
    }

    pages.forEach((page, pageIndex) => {
        let embeded = new EmbedBuilder()
        if (page.title) embeded.setTitle(page.title)
        else if (embed.title) embeded.setTitle(embed.title)

        if (embed.url) embeded.setURL(embed.url)
        else if (embed.url) embeded.setURL(embed.url)

        // if (embed.files) embeded.files = embed.files;
        // embeded.
        if (page.description) embeded.setDescription(page.description)
        else if (embed.description) embeded.setDescription(embed.description)

        if (page.thumbnail) embeded.setThumbnail(page.thumbnail)
        else if (embed.thumbnail) embeded.setThumbnail(embed.thumbnail)

        if (page.image) embeded.setImage(page.image)
        else if (embed.image) embeded.setImage(embed.image)

        if (page.author || embed.author || page.icon || embed.icon) embeded.setAuthor({ name: page.author ? page.author : embed.author, iconURL: page.icon ? page.icon : embed.icon })
        else if (page.author) embeded.setAuthor(page.author)

        if (page.color) embeded.setColor(page.color)
        else if (embed.color) embeded.setColor(embed.color)

        if (embed.footer && pages.length > 1) embeded.setFooter({ text: `『 Page ${pageIndex + 1}/${pages.length}』 Lucid Bot` })
        else if (embed.footer) embeded.setFooter({ text: `Lucid Bot` })

        if (page.fields) {
            let blanks = 0
            let fields: APIEmbedField[] = []
            const firstPage = pages[0]
            page.fields.forEach((field, index) => {
                field.options = {
                    inline: field.inline == undefined ? true : false,
                    blank: false,
                    blankTitle: false,
                    escapeFormatting: false,
                    compare: false,
                    ...field.options
                }

                if (field.options.blank == true) {
                    if (firstPage.fields[index].options.blank !== true) blanks++
                    fields.push({
                        name: "\u200b",
                        value: "\u200b",
                        inline: field.options.inline
                    })
                }
                else {
                    if (field.options.changelog == true) {
                        let values: any = []
                        field.value.forEach((subValue, index) => {
                            values.push(`\`+\` ${subValue.name ? `**${subValue.name}**:` : ""} ${subValue.value}`)
                        })
                        fields.push({
                            name: field.name ? field.name : "\u200b",
                            value: values,
                            inline: false
                        })
                    } else if (Array.isArray(field.value)) {
                        var values: any = []
                        field.value.forEach((subValue, index) => {
                            values.push(`+ **${subValue.name}**: \`${(subValue.value || 0).toLocaleString()}\``)
                        })
                        fields.push({
                            name: field.name ? field.name : "\u200b",
                            value: values,
                            inline: field.options.inline
                        })
                    } else {
                        let firstField = firstPage.fields[index - blanks]
                        if (field.options.escapeFormatting == true) {
                            fields.push({
                                name: field.name ? field.name : "\u200b",
                                value: `${field.value ? Number.isInteger(field.value) ? field.value.toLocaleString() : field.value : 0}`,
                                inline: field.options.inline
                            })
                        }
                        else if (field.options.blankTitle == true) {
                            fields.push({
                                name: "\u200b",
                                value: `\`${field.value ? Number.isInteger(field.value) ? field.value.toLocaleString() : field.value : 0}\``,
                                inline: field.options.inline
                            })
                        }
                        else if (field.options.compare == true) {
                            fields.push({
                                name: field.name ? field.name : "\u200b",
                                value: `\`${field.value ? Number.isInteger(field.value) ? field.value.toLocaleString() : field.value : 0}\` **|** \`${field.value2 ? Number.isInteger(field.value2) ? field.value2.toLocaleString() : field.value2 : 0}\`\n ${!isNaN(field.value) || field.value == undefined && !isNaN(field.value2) || field.value == undefined ? `${field.value || 0, field.value2 || 0} \`${Math.abs((field.value || 0) - (field.value2 || 0)).toLocaleString()}\`` : ` `}`,
                                inline: field.options.inline
                            })
                        }
                        else {
                            fields.push({
                                name: field.name ? field.name : firstField ? firstField.name : "\u200b",
                                value: `\`${field.value ? Number.isInteger(field.value) ? field.value.toLocaleString() : field.value : 0}\``,
                                inline: field.options.inline
                            })
                        }
                    }
                }
            })
            embeded.addFields(fields)
        }
        embeds.push(embeded)
    })

    return embeds
}
