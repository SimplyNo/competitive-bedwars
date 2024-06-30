import { CategoryChannel, InteractionResponse, Message, SlashCommandBuilder, User, VoiceChannel } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
import { Wrappers } from "../../wrappers/Wrappers";
import { SlashCommand } from "../../types/command/SlashCommand";
import { SlashCommandContext } from "../../types/command/SlashCommandContext";

export default class ForceNickCommand extends SlashCommand {
    constructor() {
        super({
            name: 'forcenick',
            slash: new SlashCommandBuilder()
                .setName('forcenick')
                .setDescription('Force a nickname on someone.')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to force a nickname on.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('nickname')
                        .setDescription('The nickname to force.')
                        .setRequired(true)
                ),
            type: 'admin',
            adminOnly: true,
            usage: '<user>'
        })
    }
    async run({ bot, interaction, serverConf, verifiedConfig: userConfig }: SlashCommandContext): Promise<void | Message<boolean> | InteractionResponse> {
        const user = interaction.options.get('user')?.user as User;
        const nickname = interaction.options.get('nickname')?.value as string;
        const verified = bot.getVerifiedUser({ id: user.id });
        if (!verified) return interaction.reply({ content: `This user is not registered.` });
        verified.set({ nick: nickname });
        verified.getUser().updateMember(true);
        interaction.reply({ content: `${user.username}'s nickname has been set to **${nickname}**.` });
    }
}