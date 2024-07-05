import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import { Wrappers } from "../../wrappers/Wrappers";
let validChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ~!@#$%^&*()_+-=`,./;'[]<>?:{}\"|\\1234567890 ";
const hasInvalidChars = (string: string) => Array.from(string).some(el => !Array.from(validChars).includes(el));

export default class RegisterCommand extends Command {
    constructor() {
        super({
            name: 'register',
            description: 'Link Discord account to a minecraft account',
            type: 'verification',
            aliases: ['r', 'link', 'verify'],
            usage: '<username>',
            cooldown: 3
        })
    }
    async run({ bot, args, message, serverConf, prefix }: CommandContext): Promise<void | Message<boolean>> {
        if (await bot.getVerifiedUser({ id: message.author.id })) {
            var embed = bot.createErrorEmbed()
                .setAuthor({ name: `Registration Error` })
                .setDescription(`Your Discord is already registered with an account!`)
            return message.channel.send({ embeds: [embed] })
        }
        if (!args.length) return bot.createErrorEmbed(message).setDescription("You need to provide a username to verify as!").send();
        const player = await Wrappers.hypixel.player(args[0], { force: true });

        if (!player || player.exists == false) return bot.createErrorEmbed(message).setDescription("Please specifiy a valid username or uuid.").send()
        else if (player.outage == true) return bot.createErrorEmbed(message).setDescription("There is currently a Hypixel API Outage, responses may be slower or nonexistent").send()

        if (!hasInvalidChars(message.author.username)) {
            if (!player.socialMedia || !player.socialMedia.links || !player.socialMedia.links.DISCORD) {
                var embed = bot.createErrorEmbed()
                    .setAuthor({ name: `Registration Error` })
                    .setDescription(`This username does not have their Discord account linked on Hypixel!\n\nPlease follow the directions in <#1247139184041525311> to link your account.`)
                return message.channel.send({ embeds: [embed] })
            }

            if (Number(message.author.discriminator) ? player.socialMedia.links.DISCORD == message.author.tag : player.socialMedia.links.DISCORD == message.author.username) {
                bot.addVerifiedUser(message.author.id, player.uuid, player.displayname);
                bot.logger.log(bot.config.channels.verificationLogs, {
                    embeds: [bot.createEmbed().setAuthor({ name: `User Verified!`, iconURL: message.author.avatarURL()! }).setDescription(`<@${message.author.id}> (\`${Number(message.author.discriminator) ? message.author.tag : message.author.username}\`) successfully verified as ${player.emojiRank} **${player.displayname}**!`)
                        .setFooter({ text: `UUID: ${player.uuid}` })
                        .setThumbnail(Util.genHeadImage(player.uuid))]
                })

                // message.member?.roles.add(serverConf.welcomeRoles)
                var embed = bot.createEmbed()
                    .setAuthor({ name: `Registration Successful` })
                    .setDescription(`Successfully registered your account to ${player.emojiRank} **${player.displayname}**.`)
                    .setFooter({ text: `UUID: ${player.uuid}` })
                // .setThumbnail(Util.genHeadImage(player.uuid));
                return message.channel.send({ embeds: [embed] })
            } else {
                var embed = bot.createErrorEmbed()
                    .setAuthor({ name: `Registration Error` })
                    .setDescription(`Your discord does not match the one linked with your account! (\`${player.socialMedia.links.DISCORD}\`)\n\nPlease follow the directions in <#1247139184041525311> to link your account.`)
                return message.channel.send({ embeds: [embed] })
            }
        } else {
            let username = message.author.username;

            let base64 = Buffer.from(username).toString("base64");

            let randomChar = base64.substring(0, 5).toUpperCase().replace('+', '_');
            if (!player.socialMedia || !player.socialMedia.links || !player.socialMedia.links.DISCORD || player.socialMedia.links.DISCORD !== randomChar + "#0001") {
                var embed = bot.createErrorEmbed()
                    .setAuthor({ name: `Registration Error` })
                    .setDescription(`This player does not have their Hypixel Discord set to the correct code!\n\n❌ **__WARNING Because you have special characters in your username, please follow the instructions below to link your account:**__\n\n**1.** Log on to Hypixel and type \`/profile\`\n**2.** Click on "Social Medias"\n**3.** Click on "Discord"\n**4.** Type the following in the chat: **\`${randomChar}#0001\`**\n**5.** Use \`=register ${player.displayname}\` again to verify!\n\n_Having trouble verifying? Ping a staff member!_`)
                return message.channel.send({ embeds: [embed] })
            } else if (player.socialMedia.links.DISCORD == randomChar + "#0001") {
                bot.addVerifiedUser(message.author.id, player.uuid, player.displayname)
                bot.logger.log(bot.config.channels.verificationLogs, {
                    embeds: [bot.createEmbed().setAuthor({ name: `User Verified!`, iconURL: message.author.avatarURL()! }).setDescription(`<@${message.author.id}> (\`${Number(message.author.discriminator) ? message.author.tag : message.author.username}\`) successfully verified as ${player.emojiRank} **${player.displayname}**!`)
                        .setFooter({ text: `UUID: ${player.uuid}` })
                        .setThumbnail(Util.genHeadImage(player.uuid))]
                })


                // message.member?.roles.add(serverConf.welcomeRoles)

                var embed = bot.createEmbed()
                    .setAuthor({ name: `Registration Successful` })
                    .setDescription(`Successfully registered your account to **${player.displayname}**.`)
                    .setFooter({ text: `UUID: ${player.uuid}` })

                // .setThumbnail(Util.genHeadImage(player.uuid));

                // message.member?.setNickname(`${player.displayname} [${player.level}]`).catch(e => console.log(`Unable to rename this user ->\n${e}`));
                return message.channel.send({ embeds: [embed] })
            }
        }
    }
}
