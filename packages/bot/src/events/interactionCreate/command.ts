import { Collection } from "discord.js";
import { CommandContext, Event } from "../../types";
import { Util } from "../../util/Util";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
const cooldowns = new Collection<string, Collection<string, number>>();

export default {
    name: "interactionCreate",
    once: false,
    async run(bot, interaction) {
        if (!interaction.isCommand()) return;
        if (!interaction.inCachedGuild()) return;
        if (interaction.guild.id !== bot.mainGuild) return;

        const command = bot.slashCommands.get(interaction.commandName);
        if (!command) return;

        const { cooldown } = command;
        if (cooldown) {
            if (!cooldowns.has(command.name)) {
                cooldowns.set(command.name, new Collection());
            }
            const timestamps = cooldowns.get(command.name)?.get(interaction.user.id) || 0;
            if (timestamps > Date.now()) {
                return bot.createErrorEmbed(interaction)
                    .setTitle(`Command on Cooldown!`)
                    .setDescription(`You can reuse the \`${command.name}\` command in ${Util.getDiscordTimeFormat(timestamps, 'R')}.`)
                    .send()
            }
        }

        const context = new SlashCommandContext(bot, interaction);
        if (command.adminOnly && !interaction.member?.permissions.has('Administrator') && !bot.config.developers.includes(interaction.member?.id!)) return bot.createErrorEmbed(interaction).setDescription(`You must be an administrator to use this command!`).send();
        if (command.devOnly && !bot.config.developers.includes(interaction.user.id)) return bot.createErrorEmbed(interaction).setDescription(`You must be a developer to use this command!`).send();
        if (command.staffOnly && !interaction.member.roles.cache.some(role => bot.config.roles.staff.includes(role.id))) return bot.createErrorEmbed(interaction).setDescription(`You must be a staff member to use this command!`).send()
        if (command.allowedRoles && !interaction.member?.roles.cache.some(role => !!command.allowedRoles?.includes(role.id)) && !bot.config.developers.includes(interaction.user.id)) return bot.createErrorEmbed(interaction).setDescription(`You must have one of the following roles to use this command: ${command.allowedRoles?.map(role => `<@&${role}>`).join(', ')}`).send();
        bot.log(`&7[Commands] &a${interaction.user.tag}&7 ran command &a${interaction.toString()}&7 in &a${interaction.guild.name}&7 (${interaction.guild.id})`)

        try {
            if (cooldown) cooldowns.get(command.name)?.set(interaction.user.id, Date.now() + cooldown * 1000);
            await command.run(context);
        } catch (error) {
            interaction.reply(`An error occured while running the command: ${error}`);
            console.error(`There was a command error!`, error);
        }


    }

} as Event<"interactionCreate">