import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder } from "discord.js"

export type EconomyCooldown = {
    cooldown: number,
    error: string
}
export interface SlashCommandOptions extends Omit<CommandOptions, "description"> {
    slash: SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder
}
export interface CommandOptions {
    name: string,
    adminOnly?: boolean,
    description: string,
    staffOnly?: boolean,
    guildMemberOnly?: boolean,
    devOnly?: boolean,
    type?: CommandType
    aliases?: string[],
    usage?: string,
    examples?: string[],
    cooldown?: number,
    allowedRoles?: string[],
    economyCooldown?: EconomyCooldown
}
export const realNames = {
    dev: "🤓 Developer",
    admin: "<:bluq:725843128745197649> Admin",
    moderation: "🔨 Moderation",
    guild: "<:lucid:870428643283853382> Guild",
    verification: "✅ Verification",
    config: "⚙️ Config",
    game: "🕹️ Game",
    tokens: "🪙 Tokens",
    misc: "❓ Misc.",
    event: "🎃 Event",
    economy: "🤑 Economy",
}
export type CommandType = keyof typeof realNames;