import { AutocompleteInteraction, CacheType, InteractionResponse, Message, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../types/command/SlashCommand";
import { CommandContext } from "../../types";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";
import { Util } from "../../util/Util";
import { AutoCompleteContext } from "../../types/command/AutoCompleteContext";
import moment from "moment";
export default class LiftStrikeCommand extends SlashCommand {
    constructor() {
        super({
            name: "liftstrike",
            staffOnly: true,
            slash: new SlashCommandBuilder()
                .setName("liftstrike")
                .setDescription("Remove a strike")
                .addUserOption(subcmd =>
                    subcmd
                        .setName("user")
                        .setDescription("The user to lift strike")
                        .setRequired(true))
                .addStringOption(subcmd =>
                    subcmd
                        .setName("strike")
                        .setAutocomplete(true)
                        .setDescription("The strike to be removed")
                        .setRequired(true)
                )
                .addStringOption(subcmd =>
                    subcmd
                        .setName("reason")
                        .setDescription("The reason for the removal")
                        .setRequired(true)
                )
        });
    }
    async autocomplete({ bot, interaction }: AutoCompleteContext): Promise<void> {

        const user = interaction.options.get("user")?.value as string;
        const userConfig = bot.getUser(user);
        const strikes = userConfig.strikes.map((w, id) => ({ ...w, id })).reverse().slice(0, 25);
        interaction.respond(!strikes.length ? [{ name: 'This user has no strikes', value: '0' }] : strikes.map((strike) => ({ name: `(${(bot.getUser(strike.moderator).username)}) ${truncate(strike.reason!, 80)}`, value: `${strike.id}` })))
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const user = interaction.options.get("user", true).user!;
        const strikeID = parseInt(interaction.options.get("strike", true).value as string);
        const reason = interaction.options.get("reason", true).value as string;
        const userconfig = bot.getUser(user.id);
        if (isNaN(strikeID) || !userconfig.strikes[strikeID]) return interaction.reply({ content: "Invalid strike ID", ephemeral: true });

        userconfig.moderate().liftStrike(interaction.user.id, strikeID, reason);
        return bot.createEmbed(interaction)
            .setColor('Green')
            .setContent(`<@${user.id}>`)
            .setFooter({ text: `Strike lifted by ${interaction.user.username}` }).setTimestamp()
            .setDescription(`**${user?.username}** has removed of a strike for **${reason}**`).send();
    }
}

function truncate(str: string, maxLength: number): string {
    return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}