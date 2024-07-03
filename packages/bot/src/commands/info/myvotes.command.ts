import { Message } from "discord.js"
import { Command, CommandContext } from "../../types"
import { ranks } from "../../../../../score_sheet.json";
export default class MyVotesCommand extends Command {
    constructor() {
        super({
            name: 'myvotes',
            aliases: ['myvote'],
            description: 'View someone\'s pugs votes.'
        })
    }
    async run({ bot, args, message, prefix, serverConf, verifiedConfig }: CommandContext): Promise<void | Message<boolean>> {
        const user = (await bot.parseMember(args[0], message.guild)) || message.member;
        if (!user) return bot.createErrorEmbed(message).setDescription(`Failed to parse member \`${args[0]}\`.`).send()
        const userconf = bot.getUser(user.id);
        const { pugUpvotes, pugDownvotes } = userconf;

        return bot.createEmbed(message)
            .setTitle(`${userconf.getVerified()?.username}'s Pugs Votes`)
            .setDescription(`${user} currently has:`)
            .addFields([
                {
                    name: 'Upvotes:',
                    value: `${pugUpvotes || 0}`,
                    inline: true
                },
                {
                    name: 'Downvotes:',
                    value: `${pugDownvotes || 0}`,
                    inline: true
                }
            ])
            .send()
    }
}