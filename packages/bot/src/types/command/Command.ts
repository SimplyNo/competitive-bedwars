import { Message } from "discord.js";
import Embed from "../../util/Embed";
import { CommandContext } from "./CommandContext";
import { CommandOptions, CommandType, EconomyCooldown } from "./CommandOptions";

export class Command {
    public name: string;
    public aliases?: string[];
    public description?: string;
    public type?: CommandType;
    public usage?: string;
    public examples?: string[];
    public cooldown?: number;
    public allowedRoles?: string[];
    public adminOnly?: boolean;
    public devOnly?: boolean;
    public guildMemberOnly?: boolean;
    public economyCooldown?: EconomyCooldown;

    constructor(options: CommandOptions) {
        this.name = options.name;
        this.aliases = options.aliases;
        this.description = options.description;
        this.type = options.type;
        this.usage = options.usage;
        this.examples = options.examples;
        this.cooldown = options.cooldown;
        this.adminOnly = options.adminOnly;
        this.devOnly = options.devOnly;
        this.allowedRoles = options.allowedRoles;
        this.guildMemberOnly = options.guildMemberOnly;
        this.economyCooldown = options.economyCooldown;

    }
    async run(context: CommandContext): Promise<void | Message> {
        throw new Error(`Command ${this.name} doesn't provide a run method!`);
    }
}