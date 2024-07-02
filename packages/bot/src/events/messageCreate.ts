import { ChannelType, Collection } from "discord.js";
import { CommandContext, Event } from "../types";
import { Util } from "../util/Util";
const commandCooldowns = new Collection<string, Collection<string, number>>();
export const setCommandCooldown = (command: string, user: string, time: number) => commandCooldowns.get(command)?.set(user, time);
export default {
    name: "messageCreate",
    once: false,
    async run(bot, message) {
        if (message.channel.type !== ChannelType.GuildText && message.channel.type !== ChannelType.GuildVoice) return;
        if (!message.inGuild() || (message.guild?.id !== bot.mainGuild && message.guild?.id !== bot.staffGuild)) return;
        if (message.author.bot) return;

        const prefix: string = bot.config.prefix || "?";
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const context = new CommandContext(bot, message, args);
        if (context.verifiedConfig) {
            context.verifiedConfig.updateHypixelData();
        }
        if (!message.content.startsWith(prefix)) return;
        console.log(`got message command: ${message.content}`)
        const commandName = args.shift()?.toLowerCase()!;

        const command = bot.commands.get(commandName) || bot.commands.find(cmd => !!(cmd.aliases && cmd.aliases.includes(commandName)));
        if (!command) return;

        // verification channel
        if (bot.config.channels.ignoreCommands.includes(message.channel.id) && !message.member?.roles.cache.has(bot.config.roles.staff)) return message.reply(`Commands can not be used in this channel.`);

        const { cooldown } = command;
        if (cooldown) {
            if (!commandCooldowns.has(command.name)) {
                commandCooldowns.set(command.name, new Collection());
            }
            const timestamps = commandCooldowns.get(command.name)?.get(message.author.id) || 0;
            if (timestamps > Date.now() && !bot.config.roles.staff.includes(message.author.id) && !message.member?.permissions.has('Administrator')) {
                return bot.createErrorEmbed(message)
                    .setTitle(`Command on Cooldown!`)
                    .setDescription(`You can reuse the \`${command.name}\` command in **${((timestamps - Date.now()) / 1000).toFixed(1)} seconds**.`)
                    .send()
            }
        }
        if (command.adminOnly && !message.member?.permissions.has('Administrator') && !bot.config.developers.includes(message.member?.id!)) return bot.createErrorEmbed(message).setDescription(`You must be an administrator to use this command!`).send();
        if (command.devOnly && !bot.config.developers.includes(message.author.id)) return bot.createErrorEmbed(message).setDescription(`You must be a developer to use this command!`).send();
        if (command.allowedRoles && !message.member?.roles.cache.some(role => !!command.allowedRoles?.includes(role.id)) && !bot.config.developers.includes(message.author.id)) return bot.createErrorEmbed(message).setDescription(`You must have one of the following roles to use this command: ${command.allowedRoles?.map(role => `<@&${role}>`).join(', ')}`).send();
        bot.log(`&7[Commands] &a${message.author.tag}&7 ran command &a${message.content}&7 in &a${message.guild.name}&7 (${message.guild.id})`)
        try {
            if (cooldown) commandCooldowns.get(command.name)?.set(message.author.id, Date.now() + cooldown * 1000);
            await command.run(context);
        } catch (error) {
            message.reply(`An error occured while running the command: ${error}`);
            console.error(error);
        }

    }
} as Event<"messageCreate">;