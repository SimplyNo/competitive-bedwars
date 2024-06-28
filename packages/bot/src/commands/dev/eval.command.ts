import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
export default class EvalCommand extends Command {
    constructor() {
        super({
            name: "eval",
            description: "Evaluates code",
            type: "dev",
            usage: "<code>",
            examples: ["1 + 1", "message.channel.send('Hello World!')"],
            cooldown: 0,
            devOnly: true
        })
    }
    async run({ bot, args, message, serverConf, prefix, userConfig, verifiedConfig, flags }: CommandContext): Promise<void | Message<boolean>> {
        if (!args.length) return message.reply("Please provide code to evaluate.");
        const evalUnformatted = message.content.replace(prefix + 'eval', "");
        const evalFormatted = evalUnformatted.match(/```(?:js)*(.*)```$/ms)?.[1] || evalUnformatted;
        console.log(evalFormatted)
        try {
            let actualEval = await eval("(async () => {" + evalFormatted + "})()");

            var evalEmbed = bot.createEmbed()
                .setTitle(` Successful Evaluation.`)
                .setDescription(` Output Type: **${typeOf(eval(actualEval))}**\n`)
                .addFields({
                    name: `:inbox_tray: Input ->`,
                    value: `\`\`\`js\n${evalFormatted}\n\`\`\``,
                    inline: false
                }, {
                    name: `:outbox_tray: Output ->`,
                    value: `\`\`\`js\n${actualEval}\`\`\``,
                    inline: false
                })
            message.reply({ embeds: [evalEmbed] });
        } catch (e) {

            let evalEmbed = bot.createEmbed()
                .setTitle(` Unsuccessful Evaluation`)
                .addFields({
                    name: `:inbox_tray: Input ->`,
                    value: `\`\`\`js\n${evalFormatted}\`\`\``,
                    inline: false
                }, {
                    name: `:outbox_tray: Output (ERROR) ->`,
                    value: `\`\`\`js\n${e} \`\`\``,
                    inline: false
                })
            message.reply({ embeds: [evalEmbed] });
            return;
        }
    }
}

function typeOf(obj) {
    return {}.toString
        .call(obj)
        .split(" ")[1]
        .slice(0, -1)
        .toLowerCase();
}