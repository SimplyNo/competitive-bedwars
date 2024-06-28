import { Event } from "../types";

export default {
    name: "guildMemberAdd",
    once: false,
    async run(bot, member) {
        if (member.guild.id !== bot.mainGuild) return;
        const { guild } = member;
        const serverConf = bot.getServerConfig(guild.id);
        const welcomeChannel = await bot.parseChannel(bot.config.channels.welcome, guild);
        const verifiedUser = bot.getVerifiedUser({ id: member.id });

        if (welcomeChannel && welcomeChannel.isTextBased()) {
            //             welcomeChannel.send({
            //                 content: `${member}`,
            //                 embeds: [
            //                     bot.createEmbed()
            //                         .setAuthor({ name: 'Welcome To Lucid!', iconURL: bot.user?.avatarURL()! })
            //                         .setTitle(`${guild.name}`)
            //                         .setDescription(`Hey, ${member},
            // Welcome to the **Lucid Guild Discord.**
            // 📄 Rules in <#746517472626343998>
            // 🤳 Socials in <#717780819795509359>`)
            //                         .addFields([
            //                             {
            //                                 name: 'Verification',
            //                                 value: `Make sure you head to ${verificationChannel} and do \`?verify [IGN]\` to be verified!`
            //                             }
            //                         ])
            //                         .setThumbnail(member.user.avatarURL()!)
            //                         .setFooter({ text: `Lucid | Member #${guild.memberCount}` })
            //                 ]
            //             })
        }

    }

} as Event<"guildMemberAdd">