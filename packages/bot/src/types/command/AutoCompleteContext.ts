import { AutocompleteInteraction, Client, CommandInteraction, Message } from "discord.js";
import { Bot, botUsers } from "../../Bot";
import { UserConfig } from "../config/UserConfig";
import { ServerConfig } from "../config/ServerConfig";
import { VerifiedConfig } from "../config/VerifiedConfig";
export class AutoCompleteContext {
    public serverConf: ServerConfig;
    public verifiedConfig?: VerifiedConfig & { uuid: string };
    public userConfig: UserConfig;
    constructor(public bot: Bot, public interaction: AutocompleteInteraction<'cached'>) {
        this.serverConf = bot.getServerConfig(interaction.guild.id);
        this.verifiedConfig = bot.getVerifiedUser({ id: interaction.user.id });
        let botuser = bot.getUser(interaction.user.id);

        if (botuser) {
            this.userConfig = botuser;
        } else {
            this.bot.getUser(interaction.user.id).set({ id: interaction.user.id, username: interaction.user.tag });
            this.userConfig = bot.getUser(interaction.user.id)!;
        }
    }

}