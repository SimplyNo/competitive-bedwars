import { AttachmentBuilder, Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import fs from 'fs';
export default class TestCommand extends Command {
    constructor() {
        super({
            name: "test",
            description: "test",
            type: "dev",
            usage: "<code>",
            cooldown: 0,
            devOnly: true
        })
    }
    async run({ bot, args, message, serverConf, prefix, userConfig, verifiedConfig, flags }: CommandContext): Promise<void | Message<boolean>> {
        // const image = fs.readFileSync('../../assets/rules.png');
        await message.reply({
            files: [
                new AttachmentBuilder('../../assets/rules.png')
            ]
        })
    }
}

