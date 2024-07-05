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
    economyCooldown?: EconomyCooldown,
    subcommands?: {
        usage: string;
        description: string;
    }[]
}
export const realNames = {
    dev: {
        name: "Developer Commands",
        emoji: "👨‍💻",
        adminOnly: true
    },
    admin: {
        name: "Admin Commands",
        emoji: "👮‍♂️",
        adminOnly: true
    },
    verification: {
        name: "Verification Commands",
        emoji: "👮‍♂️",
        adminOnly: true
    },
    config: {
        name: "User Config Commands",
        emoji: "⚙",
    },
    moderation: {
        name: "Moderation Commands",
        emoji: "👮‍♂️"
    },
    game: {
        name: "Game Commands",
        emoji: "🎮",
    },
    queue: {
        name: "Queue Commands",
        emoji: "🎮",
    },
    stats: {
        name: "Stat Commands",
        emoji: "📊",
    },
    info: {
        name: "Info Commands",
        emoji: "ℹ",
    },
    party: {
        name: "Party Commands",
        emoji: "🎉",
    },
    pugs: {
        name: "PUGs Commands",
        emoji: "🎮",
    },
    premium: {
        name: "Premium Commands",
        emoji: "💎",
    },
    misc: {
        name: "Misc",
        emoji: "❓"
    }

}
export type CommandType = keyof typeof realNames;