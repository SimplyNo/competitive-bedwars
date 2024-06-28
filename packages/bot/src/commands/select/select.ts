import { Message } from "discord.js";
import { CommandContext } from "../../types";
import { Command } from "../../types/command/Command";

export default class MyVoteCommand extends Command {
    constructor() {
        super({
            name: 'myvote',
            description: 'Shows the amount of upvotes and downvotes you have for select',
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {


    }

}