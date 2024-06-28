import { Client, Message } from "discord.js";
import { Bot, botUsers } from "../../Bot";
import { UserConfig } from "../config/UserConfig";
import { Command } from "./Command";
import { VerifiedConfig } from "../config/VerifiedConfig";
import { ServerConfig } from "../config/ServerConfig";
export type commandFlags = { [key: string]: { name: string, value: string, index: number, fullValue: string } }
export class CommandContext {
    public serverConf: Partial<ServerConfig>;
    public prefix: string;
    public verifiedConfig?: VerifiedConfig & { uuid: string };
    public userConfig: UserConfig;
    public flags: commandFlags;
    constructor(public bot: Bot, public message: Message<true>, public args: string[]) {
        this.serverConf = bot.getServerConfig(message.guild.id);

        this.prefix = bot.config.prefix || "?";
        this.verifiedConfig = bot.getVerifiedUser({ id: message.author.id });
        this.flags = args.reduce((prev, curr, index) => { return curr.startsWith('-') ? { ...prev, [curr.replace(/^-*/, '')]: { name: curr.replace(/^-*/, ''), value: args[index + 1] || false, index: index, fullValue: args.filter((el, i) => { let iNxt = args.indexOf(args.find((e, indx) => indx > index && e.startsWith('-'))!); return index < i && i < (iNxt != -1 ? iNxt : args.length) }).join(" ") } } : prev }, {});
        Object.values(this.flags).forEach(flag => {
            args.splice(flag.index, 1);
        })
        if (this.flags.s || this.flags.silent) {
            let flag = this.flags.s || this.flags.silent;
            args.splice(flag.index, 1);
            message.delete()
        }
        this.userConfig = bot.getUser(message.author.id)!;
    }

}