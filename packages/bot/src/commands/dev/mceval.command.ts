import { Message } from "discord.js";
import { Command, CommandContext } from "../../types";
import { Util } from "../../util/Util";
export default class McEvalCommand extends Command {
    constructor() {
        super({
            name: "mceval",
            description: "Evaluates code (minecraft bridge)",
            type: "dev",
            usage: "<code>",
            cooldown: 0,
            devOnly: true
        })
    }
    async run({ bot, args, message, serverConf, prefix, userConfig, verifiedConfig, flags }: CommandContext): Promise<void | Message<boolean>> {
        if (!args.length) return message.reply("Please provide code to evaluate.");
        const evalUnformatted = message.content.replace(prefix + 'mceval', "");
        const evalFormatted = evalUnformatted.match(/```(?:js)*(.*)```$/ms)?.[1] || evalUnformatted;
        console.log(evalFormatted)
        let evalStr = ("(async () => {" + evalFormatted + "})()");
        let actualEval = await (await bot.api.autoscore.send('eval', { data: evalStr }));
        if (!actualEval) return message.reply("Failed to connect with minecraft process or the process died.");
        console.log(`resp:`, actualEval)
        if (Object.hasOwn(actualEval, "result")) {
            var evalEmbed = bot.createEmbed()
                .setTitle(` Successful Evaluation.`)
                .addFields({
                    name: `:inbox_tray: Input ->`,
                    value: `\`\`\`js\n${evalFormatted}\n\`\`\``,
                    inline: false
                }, {
                    name: `:outbox_tray: Output ->`,
                    value: `\`\`\`js\n${actualEval.result}\`\`\``,
                    inline: false
                })
            message.reply({ embeds: [evalEmbed] });
        } else {

            let evalEmbed = bot.createEmbed()
                .setTitle(` Unsuccessful Evaluation`)
                .addFields({
                    name: `:inbox_tray: Input ->`,
                    value: `\`\`\`js\n${evalFormatted}\`\`\``,
                    inline: false
                }, {
                    name: `:outbox_tray: Output (ERROR) ->`,
                    value: `\`\`\`js\n${actualEval.error} \`\`\``,
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