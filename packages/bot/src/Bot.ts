import chalk from "chalk";
import { ButtonInteraction, Client, ClientOptions, Collection, CommandInteraction, Guild, GuildBasedChannel, GuildMember, Message } from "discord.js";
import Enmap from "enmap";
import config from "../../../config.json";
import { Command, Event } from "./types";
import { UserConfig, RawUserConfig } from "./types/config/UserConfig";
import { Interval } from "./types/interval/Interval";
import { Logger } from "./types/logger/Logger";
import Embed from "./util/Embed";
import { Util } from "./util/Util";
import { SlashCommand } from "./types/command/SlashCommand";
import { ServerConfig, RawServerConfig } from "./types/config/ServerConfig";
import { RawVerifiedConfig, VerifiedConfig } from "./types/config/VerifiedConfig";
import { MatchMaker } from "./core/matchmaking/MatchMaker";
import { RankedGameManager } from "./core/games/RankedGameManager";
import { PartyManager } from "./core/party/PartyManager";
import { BotAPI } from "./core/api/BotAPI";
export const botUsers = new Enmap<string, RawUserConfig>({
    name: "botUsers",
})
export const serverConfig = new Enmap<string, RawServerConfig>({
    name: "serverConfig"
})
export const verifiedUsers = new Enmap<string, Partial<RawVerifiedConfig> & { id: string }>({
    name: "verifiedUsers"
})
interface tempServerConfig {
}
export class Bot extends Client {
    public __verifiedUsers = verifiedUsers;
    private verifiedUserInstances = new Collection<string, VerifiedConfig>();
    private serverConfigInstances = new Collection<string, ServerConfig>();
    private userConfigInstances = new Collection<string, UserConfig>();
    public commands: Collection<string, Command> = new Collection();
    public slashCommands: Collection<string, SlashCommand> = new Collection();
    public intervals: Collection<string, Interval> = new Collection();
    public messageEditRateLimits = new Collection<string, number>();
    public config = config;
    public mainGuild = config.mainServer;
    public staffGuild = config.staffServer;
    public tempServerConfig = new Collection<string, tempServerConfig>();
    public logger = new Logger(this);
    public matchMaking = new MatchMaker(this);
    public rankedManager = new RankedGameManager(this);
    public partyManager = new PartyManager(this);
    public api = new BotAPI(this);
    constructor(options: ClientOptions) {
        super(options);
        this.api.listen();
        this.loadSlashCommands()
            .then(async () => {
                await this.loadCommands();
                await this.loadEvents();
                await this.login(this.config.discordToken);

            })
        // this.loadIntervals();
        // moved to on READY event

    }
    public getMainGuild() {
        return this.mainGuild ? this.guilds.cache.get(this.mainGuild) : undefined;
    }
    public getStaffGuild() {
        return this.staffGuild ? this.guilds.cache.get(this.staffGuild) : undefined;
    }
    public getStaffServerConfig() {
        return this.getServerConfig(this.staffGuild!);
    }
    public getMainServerConfig() {
        return this.getServerConfig(this.mainGuild!);
    }
    public log(msg: any, ...args: any) {
        msg = Util.parseMessageCodes(`&7[RBW Revolution] &8` + msg)
        console.log(msg, ...args);
        return undefined;
    }
    public initLogger(name: string, code: string = '5') {
        const logger = (msg: any, ...args: any) => {
            msg = `&${code}[${name}] &8` + msg
            this.log(msg, ...args);

        };
        logger(`${name} initialized`)
        return logger
    }
    public getAllUsers() {
        return botUsers.array();
    }
    public getUser(id: string) {
        const instanced = this.userConfigInstances.get(id);
        if (instanced) return instanced;
        this.log(`Instancing user ${id}`);
        const newInstance = new UserConfig(this, botUsers.get(id) || { id });
        this.userConfigInstances.set(id, newInstance);
        return newInstance;
    }
    /**
 * should never use this outside of eval.
 *  
 * */
    public removeUser(id: string) {
        botUsers.delete(id);
        this.userConfigInstances.delete(id);
    }
    public getVerifiedUser(obj: { id?: any; username?: any; uuid?: any; nickname?: any }, force?: boolean): (VerifiedConfig & { uuid: string }) | undefined {
        // print stack trace:
        obj = {
            id: obj.id || undefined,
            username: obj.username || undefined,
            uuid: obj.uuid || undefined,
            nickname: obj.nickname || undefined
        }
        const isUser = Array.from(verifiedUsers).find(e => e[1].id === obj.id! || e[1].uuid === obj.uuid || e[1].username?.toLowerCase() === (obj?.username?.toLowerCase() || 0) || e[1].nick?.toLowerCase() === (obj?.nickname?.toLowerCase() || 0));
        if (isUser) {
            const user = isUser[1];
            if (user.uuid || force) {
                // this.log(`[${chalk.magenta.bold(`GetVerifiedUser`)}]`, obj, `UUID: ${user.uuid}`)
                const instanced = this.verifiedUserInstances.get(user.id);
                if (instanced) return instanced as (VerifiedConfig & { uuid: string });
                // this.log(`&bInstancing user ${user.username}`);
                this.verifiedUserInstances.set(user.id, new VerifiedConfig(this, user) as (VerifiedConfig & { uuid: string }));
                return this.verifiedUserInstances.get(user.id) as (VerifiedConfig & { uuid: string });
            }
        }
    }
    public getAllVerifiedUsers(): VerifiedConfig[] { return verifiedUsers.array().filter(u => u.uuid).map(u => this.getVerifiedUser({ id: u.id })!) }


    public addVerifiedUser(id: string, uuid: string, username?: string, emojiRank?: string) {
        console.log(`Adding verified user!!`, id, uuid, username, emojiRank);
        const existingUser = verifiedUsers.get(id);
        verifiedUsers.set(id, {
            id: id, uuid: uuid, lastUpdate: Date.now(), username, emojiRank, rbw: {
                elo: existingUser?.rbw?.elo ?? 0,
                bedsBroken: existingUser?.rbw?.bedsBroken ?? 0,
                gameHistory: existingUser?.rbw?.gameHistory ?? [],
                wins: existingUser?.rbw?.wins ?? 0,
                losses: existingUser?.rbw?.losses ?? 0,
                voids: existingUser?.rbw?.voids ?? 0,
                mvps: existingUser?.rbw?.mvps ?? 0,
                streak: existingUser?.rbw?.streak ?? 0,
                highestStreak: existingUser?.rbw?.highestStreak ?? 0,
                commends: existingUser?.rbw?.commends ?? 0,
            }
        });
        this.verifiedUserInstances.set(id, new VerifiedConfig(this, verifiedUsers.get(id)!));
        this.getUser(id).updateMember(true);
        return true;
    }
    public updateVerifiedUser(id: string, data: Partial<RawVerifiedConfig>) {
        const user = this.getVerifiedUser({ id });
        // console.log(`sestting ddata! :))))))))))))}`, data, user)
        if (user) {
            // console.log(`it orked somehow`, data)
            verifiedUsers.set(id, { ...user, ...data });
        } else {
            console.log(`Im not verifying this user: ${id}`, user)
        }
    }
    public removeVerifiedUser(obj: { id: string }) {
        verifiedUsers.set(obj.id, null, 'uuid');
        verifiedUsers.set(obj.id, null, 'username');
        this.verifiedUserInstances.delete(obj.id);
        this.getUser(obj.id).updateMember(true);
        return true;
    }

    public getAllServerConfig() {
        return serverConfig;
    }
    public loadServerConfig(id: string) {
        this.log(`&aInitialized server config for ${id}`);
        const instance = new ServerConfig(this, serverConfig.get(id) || { id })
        this.serverConfigInstances.set(id, instance);
        return instance;
    }
    public getServerConfig(id: string): ServerConfig {
        return this.serverConfigInstances.get(id) || this.loadServerConfig(id);
    }
    public setServerConfig<K extends keyof ServerConfig>(id: string, key: K, config: ServerConfig[K] | undefined) {
        // const lastConfig = serverConfig.get(id)?.[key];
        // if (Array.isArray(lastConfig) && Array.isArray(config) && config) {
        //     let newArray = lastConfig as unknown[];
        //     if (newArray.length) {
        //         newArray = newArray.filter(e => !config!.includes(e));
        //         newArray.push(...config!);
        //         return serverConfig.set(id, newArray, key);
        //     }
        // 
        // if (typeof config === 'object' && config !== null) {
        //     return serverConfig.set(id, mergeDefault(this.getServerConfig(id)[key], config), key);
        // }
        return serverConfig.set(id, config, key);
    }
    createEmbed(messageOrInteraction?: Message | CommandInteraction | ButtonInteraction): Embed {

        let MessageEmbed = new Embed(messageOrInteraction)
        // .setFooter(this.config.footer.text.replace(/%VERSION%/g, this.config.version), this.config.footer.url ?? undefined);

        return MessageEmbed;

    }
    public createSuccessEmbed(message?, text?) {
        let embed = this.createEmbed(message)
            .setDescription(`${text || "Success!"}`)
            .setColor('#ffffff');
        embed.isSuccessEmbed = true;
        return embed;
    }
    public createErrorEmbed(message?, text?) {
        return this.createEmbed(message)
            // .setColor('#000000')
            .setColor('Red')
            .setDescription(`${text || "An error occured!"}`)
        // .setFooter({ text: `❌ ${text || "Error"}` })
    }
    public async parseChannel(input, guild: Guild) {
        if (!input || !guild) return;
        let channel: GuildBasedChannel | undefined;
        if (guild.channels.cache.get(input)) {
            channel = guild.channels.cache.get(input)
        } else if (guild.channels.cache.get(input.match(/\<#([0-9]*?)\>/) ? input.match(/\<#([0-9]*?)\>/)[1] : null)) {
            channel = guild.channels.cache.get(input.match(/\<#([0-9]*?)\>/)[1]);
        } else if (guild.channels.cache.find(ch => ch.name.toLowerCase() == input.toLowerCase())) {
            channel = guild.channels.cache.find(ch => ch.name.toLowerCase() == input.toLowerCase());
        }
        if (channel?.isTextBased()) return channel;
        return;

    }

    public async parseRole(input, guild: Guild) {
        // if (serverConf && serverConf.roleList) {
        //     let alias = serverConf.roleList.list.find(e => e.name.toLowerCase() == input.toLowerCase())
        //     if (alias) return guild.roles.cache.get(alias.role);
        // }
        if (!input) return undefined;
        if (guild.roles.cache.get(input)) {
            return guild.roles.cache.get(input)
        } else if (guild.roles.cache.get(input.match(/\<@&([0-9]*?)\>/) ? input.match(/\<@&([0-9]*?)\>/)[1] : null)) {
            return guild.roles.cache.get(input.match(/\<@&([0-9]*?)\>/)[1]);
        } else if (guild.roles.cache.find(r => r.name.toLowerCase() == input.toLowerCase())) {
            return guild.roles.cache.find(r => r.name.toLowerCase() == input.toLowerCase());
        }
        return undefined;

    }

    public async parseMember(input: string, guild: Guild): Promise<GuildMember | undefined | null> {
        if (!input) return null;
        let match = input.match(/<@.?[0-9]*?>/);
        let mentionedID;
        const verified = this.getVerifiedUser({ username: input });
        if (verified) return verified.getUser().resolveMember();
        if (match) {
            mentionedID = input.replace(/!/g, '').slice(2, -1)
        } else if (guild.members.cache.has(input)) {
            return guild.members.cache.get(input);
        } else if (guild.members.cache.find(m => m.user.username.toLowerCase() == input.toLowerCase())) {
            return guild.members.cache.find(m => m.user.username.toLowerCase() == input.toLowerCase());
        } else if (guild.members.cache.find(m => m.nickname?.toLowerCase() == input.toLowerCase())) {
            return guild.members.cache.find(m => m.nickname?.toLowerCase() == input.toLowerCase());
        } else {
            mentionedID = input;
        }
        let member = await guild.members.fetch(mentionedID).catch(e => null);
        return member;
    }
    private async loadCommands() {
        const files = Util.getAllFiles("src/commands");
        for (const file of files) {
            // console.log(file)
            if (!file.endsWith(".command.js") && !file.endsWith(".command.ts")) continue;
            // console.log(await import(`../commands/config`))
            const command: { new(): Command } = (await import(`../${file}`))!.default;
            const commandToLoad = new command();

            this.commands.set(commandToLoad.name, commandToLoad);

            if (!commandToLoad.name) console.log(file)
            this.log(`&7[Commands] ${chalk.white(`Loaded command '${chalk.greenBright(commandToLoad.name)}'`)}`)
        }
        this.log('Commands loaded!');
    }
    private async loadSlashCommands() {
        const files = Util.getAllFiles("src/commands");
        for (const file of files) {
            if (!file.endsWith(".slash.js") && !file.endsWith(".slash.ts")) continue;
            const command: { new(): SlashCommand } = (await import(`../${file}`))!.default;
            const commandToLoad = new command();

            this.slashCommands.set(commandToLoad.name, commandToLoad);

            if (!commandToLoad.name) console.log(file)
            this.log(`&7[Commands] ${chalk.white(`Loaded (/) command '${chalk.greenBright(commandToLoad.name)}'`)}`)

        }
    }
    private async loadEvents() {
        const files = Util.getAllFiles("src/events");
        for (const file of files) {
            if (!file.endsWith(".js") && !file.endsWith(".ts")) continue;
            let event: Event<any> = (await import(`../${file}`))?.default;
            if (event.once) {
                this.once(event.name, (...args) => event.run(this, ...args));
            } else {
                this.on(event.name, (...args) => event.run(this, ...args));
            }
        }
        this.log('Events loaded!');
    }
    public async loadIntervals() {
        const files = Util.getAllFiles("src/intervals");
        for (const file of files) {
            if (!file.endsWith(".interval.js") && !file.endsWith(".interval.ts")) continue;
            let interval: { new(): Interval } = (await import(`../${file}`))!.default;
            const intervalToLoad = new interval();
            this.intervals.set(intervalToLoad.name, intervalToLoad);
            intervalToLoad.start(this);
        }
        this.log('Intervals loaded!');
    }

    public async formatMentions(message: string) {
        const guildId = this.mainGuild!;
        const guild = this.getMainGuild();
        if (message.includes('<@') && message.includes('>') && !message.includes('<@&')) {
            const mentions = message.match(/<@!?\d+>/g)!;
            const members = await this.guilds.cache.get(guildId)?.members?.fetch()!;
            for (const mention of mentions) {
                const user = members.get(mention.replace(/[^0-9]/g, ''));
                if (user) {
                    message = message.replace(mention, `@${user.user.username}`);
                } else {
                    message = message.replace(mention, `@Unknown User`);
                }
            }
        }
        if (message.includes('<@&') && message.includes('>')) {
            const mentions = message.match(/<@&\d+>/g)!;
            const roles = await guild?.roles.fetch()!;
            for (const mention of mentions) {
                const role = roles.get(mention.replace(/[^0-9]/g, ''));
                if (role) {
                    message = message.replace(mention, `@${role.name}`);
                } else {
                    message = message.replace(mention, `@Unknown Role`);
                }
            }
        }
        if (message.includes('<#') && message.includes('>')) {
            const mentions = message.match(/<#\d+>/g)!;
            for (const mention of mentions) {
                message = message.replace(mention, `#${guild?.channels?.cache?.get(mention.replace(/[^0-9]/g, ''))?.name || 'deleted-channel'}`);
            }
        }
        if ((message.includes('<a:') || message.includes('<:')) && message.includes('>')) {
            let mentions = [...(message?.match(/<a:\w+:\d+>/g) || []), ...(message?.match(/<:\w+:\d+>/g) || [])];
            for (const mention of mentions) {
                const emojiName = mention.replace(/[0-9]/g, '').replace(/<a:/g, '').replace(/:>/g, '').replace(/<:/g, '');
                message = message.replace(mention, `:${emojiName}:`);
            }
        }

        return message;
    }
}