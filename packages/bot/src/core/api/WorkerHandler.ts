import { ChannelType, CreateChannelOptions, GuildChannel, GuildChannelCreateOptions, GuildChannelTypes, MappedGuildChannelTypes } from "discord.js";
import { BotToWorkerData } from "../../../../workers/src/WorkerAPI";
import { Bot } from "../../Bot";

export default class WorkerHandler {
    constructor(private bot: Bot) {

    }
    private async send<T extends keyof BotToWorkerData>(path: T, data: BotToWorkerData[T]) {
        console.log(`POST DATA TO WORKER:`, data);
        const res = await fetch(`http://localhost:${this.bot.config.api.ports.workers}/${path}`, {
            method: "POST",
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(data),
        }).then(res => res.json()).catch(e => null);
        return res;
    }
    public async deleteChannel(channelID: string) {
        const result = await this.send('deletechannel', { channelID }).catch(e => null);
        if (!result?.success) {
            this.bot.getMainGuild()?.channels.cache.get(channelID)?.delete().catch(e => null);
        }
    }
    public async moveMember(memberID: string, channelID: string) {
        const result = await this.send('movemember', { memberID, channelID }).catch(e => null);
        console.log(`result:`, result);
        if (!result?.success) {
            this.bot.getMainGuild()?.members.cache.get(memberID)?.voice.setChannel(channelID).catch(e => null);
        }
    }
    public async createChannel<Type extends GuildChannelTypes>(channelOptions: GuildChannelCreateOptions & {
        type: Type;
    }): Promise<MappedGuildChannelTypes[Type]> {
        let channel: MappedGuildChannelTypes[Type] | undefined;
        console.log(`OVERWRIRETS:`, channelOptions.permissionOverwrites)
        const serializedOption = {
            ...channelOptions,
            permissionOverwrites: (<[]>channelOptions.permissionOverwrites).map((perm: any) => ({
                ...perm,
                allow: perm.allow?.map((p: any) => p.toString()),
                deny: perm.deny?.map((p: any) => p.toString()),
            }))
        }
        const result = await this.send('createchannel', serializedOption).catch(e => console.error(e));
        console.log(`result from api:`, result);
        if (result?.channelID) {
            channel = await this.bot.channels.fetch(result.channelID).catch(e => undefined) as MappedGuildChannelTypes[Type] | undefined;
        } else {
            channel = await this.bot.getMainGuild()?.channels.create(channelOptions);
        }
        // console.log(`here is channel:`, channel)
        if (!channel) throw new Error(`Failed to create channel????? Options: ${channelOptions}`,);
        return channel;
    }
}