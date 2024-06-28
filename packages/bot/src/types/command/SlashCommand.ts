import { APIApplicationCommandAutocompleteResponse, AutocompleteInteraction, InteractionResponse, Message, PermissionFlagsBits, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from "discord.js";
import Embed from "../../util/Embed";
import { CommandContext } from "./CommandContext";
import { CommandOptions, CommandType, SlashCommandOptions } from "./CommandOptions";
import { Command } from "./Command";
import { SlashCommandContext } from "./SlashCommandContext";
import { AutoCompleteContext } from "./AutoCompleteContext";

export class SlashCommand {
    public slash: SlashCommandOptionsOnlyBuilder;
    public name: string;
    public type?: CommandType;
    public usage?: string;
    public examples?: string[];
    public cooldown?: number;
    public allowedRoles?: string[];
    public adminOnly?: boolean;
    public staffOnly?: boolean;
    public devOnly?: boolean;
    constructor(options: SlashCommandOptions) {
        this.name = options.name;
        this.type = options.type;
        this.usage = options.usage;
        this.examples = options.examples;
        this.cooldown = options.cooldown;
        this.adminOnly = options.adminOnly;
        this.devOnly = options.devOnly;
        this.allowedRoles = options.allowedRoles;
        this.staffOnly = options.staffOnly;
        this.slash = options.slash;
    }
    async run(context: SlashCommandContext): Promise<void | Message | InteractionResponse> {
        throw new Error(`Command ${this.name} doesn't provide a run method!`);
    }
    /**
     * only required for autocomplete commands
     */
    async autocomplete(context: AutoCompleteContext): Promise<void> {
        throw new Error(`Command ${this.name} doesn't provide an autocomplete method!`);
    }
    getSlashCommandJSON() {
        if (this.adminOnly || this.devOnly || this.staffOnly) {
            this.slash.setDefaultMemberPermissions(0);
        }
        let JSON = this.slash.toJSON();
        return JSON;
    }
}