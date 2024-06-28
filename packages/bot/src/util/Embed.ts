import { EmbedBuilder, CommandInteraction, Message, TextChannel, User, Guild, ButtonBuilder, ActionRowBuilder, Interaction, BaseMessageOptions, InteractionReplyOptions, ButtonInteraction, Awaitable, StringSelectMenuBuilder, ComponentType, ButtonStyle, DMChannel } from "discord.js";
import { EventEmitter } from "events";
export type dropdownOption = {
    menu: {
        label: string,
        description?: string,
        value: string,
        default?: boolean
    },
    embeds: EmbedBuilder[]
}

export default class Embed extends EmbedBuilder {
    message?: Message;
    content?: string;
    dropdowns?: dropdownOption[];
    isSuccessEmbed?: boolean = false;
    constructor(public messageOrInteraction?: Message | CommandInteraction | ButtonInteraction) {
        super();
        this.setColor('#ffffff');
        this.setFooter({
            text: 'Competitive Bedwars',
            iconURL: "https://i.imgur.com/itMN1e0.png"
        })
        if (messageOrInteraction instanceof Message) {
            this.message = messageOrInteraction;
        }
        this.messageOrInteraction = messageOrInteraction;
    }
    setContent(message: string) {
        this.content = message;
        return this;
    }
    addDropdowns(dropdowns: dropdownOption[]) {
        // dropdowns = [
        //     {
        //         menu: {
        //             label: "heyo!",
        //             description: "hey!",
        //             value: "heyyyyy!"
        //         },
        //         embeds: []

        //     }
        // ]
        dropdowns = dropdowns.map((e, i) => ({ ...e, menu: { ...e.menu, value: `option-${i}` } }))
        // console.log(dropdowns[0].embeds)

        this.dropdowns = dropdowns;
        return this;
    }

    async send(channelOrInteraction?: TextChannel | CommandInteraction | DMChannel, options: InteractionReplyOptions = {}): Promise<Message> {
        let Embeds: EmbedBuilder[] = [this];
        let data: InteractionReplyOptions = {
            content: this.content,
            embeds: Embeds,
            ...options
        }
        if (this.dropdowns) {
            data.components = data.components || [];

            data.components = data.components.concat((new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(new StringSelectMenuBuilder().setCustomId('optionMenu').addOptions(this.dropdowns.map((e) => e.menu)))))
            data.embeds = this.dropdowns.find(e => e.menu.default)!.embeds;
        }
        let msg: Message;
        if (this.messageOrInteraction instanceof CommandInteraction || this.messageOrInteraction instanceof ButtonInteraction) {
            msg = await this.messageOrInteraction.reply({ ...data, fetchReply: true }) as Message;
        } else if (channelOrInteraction instanceof CommandInteraction) {
            msg = await channelOrInteraction.reply({ ...data, fetchReply: true }) as Message;
        } else if (this.messageOrInteraction instanceof Message) {
            msg = await this.messageOrInteraction.reply(data as BaseMessageOptions);

        } else {
            let channel = channelOrInteraction || this.messageOrInteraction!.channel || null;
            if (channel) {
                msg = await channel.send(data as BaseMessageOptions);
            } else {
                throw new Error('bro, this guy sent an embed without specifying anywhere to send it to.')
            }
        }

        if (this.dropdowns) {
            msg.createMessageComponentCollector({ filter: (interaction) => interaction.customId == "optionMenu", componentType: ComponentType.StringSelect, idle: 60 * 1000 })
                .on('collect', async interaction => {
                    // console.log('HIT!')
                    if (!this.messageOrInteraction || interaction.user.id !== this.messageOrInteraction?.member?.user.id) interaction.deferUpdate();
                    // console.log('HIT! x2')
                    let currentlySelected = interaction.values[0];
                    let selected = this.dropdowns!.find(e => e.menu.value == currentlySelected)!
                    console.log(selected.embeds)
                    // console.log(interaction)

                    // interaction.update({
                    //     content: "hello!"
                    // })   
                    const message = interaction.message as Message;
                    await interaction.update({
                        embeds: selected.embeds,
                        components: [
                            new ActionRowBuilder<StringSelectMenuBuilder>()
                                .addComponents([
                                    new StringSelectMenuBuilder()
                                        .setCustomId("optionMenu")
                                        .addOptions(this.dropdowns!.map(e => e.menu.value == currentlySelected ? ({ ...e.menu, default: true }) : ({ ...e.menu, default: false })))
                                ])
                        ]
                    })
                })
                .on('end', async (interaction) => {

                    msg.edit({
                        components: []
                    })
                })
        }
        return msg;

    }
    async sendAsConfirmation(channelOrInteraction?: TextChannel | DMChannel | CommandInteraction) {
        let emitter: {
            on(event: "confirm" | "cancel", listener: (button: ButtonInteraction) => Awaitable<void>): void
        } & EventEmitter = new EventEmitter();
        const id = Date.now();
        const confirmButton = new ButtonBuilder()
            .setCustomId(`confirm-${id}`)
            .setLabel("Confirm")
            .setStyle(ButtonStyle.Primary);
        const cancelButton = new ButtonBuilder()
            .setCustomId(`cancel-${id}`)
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents([confirmButton, cancelButton]);


        let data = {
            embeds: [this],
            components: [row],
            content: this.content,
        }

        let msg: Message;
        let user: User;
        if (this.messageOrInteraction instanceof CommandInteraction) {
            user = this.messageOrInteraction.user;

            msg = await this.messageOrInteraction.reply({ ...data, fetchReply: true }) as Message;

        } else if (channelOrInteraction instanceof CommandInteraction) {
            user = channelOrInteraction.user;

            msg = await channelOrInteraction.reply({ ...data, fetchReply: true }) as Message;
        } else {
            let channel = channelOrInteraction || this.messageOrInteraction?.channel || null;
            if (channel) {

                msg = await channel.send(data as BaseMessageOptions);
            } else {
                console.error('bro, this guy sent an embed without specifying anywhere to send it to.')
                return emitter;
            }
        }
        let collector = msg.channel.createMessageComponentCollector({
            componentType: ComponentType.Button,
            idle: 60000,
            filter: (button) => !user || (button.user.id == user.id)
        })
        collector.on("collect", button => {
            if (button.customId == `confirm-${id}`) {
                emitter.emit(`confirm`, button)
                msg.edit({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton.setDisabled())] })

                collector.stop("ended")
            } else if (button.customId == `cancel-${id}`) {
                emitter.emit(`cancel`, button)
                msg.edit({ components: [new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton.setDisabled())] })

                collector.stop("ended")
            }
        })
        collector.on("end", (_, reason) => {
            if (reason == "idle") {
                row.components.forEach((e, i) => row.components[i].setDisabled(true));

                // options.components = 
                msg.channel.send("Confirmation cancelled due to inactivity.")
                msg.edit({ components: [row] });

            } else if (reason == "ended") {
                // row.components.forEach((e, i) => row.components[i].setDisabled(true));

                // msg.edit({ components: [row] })

            }
        })
        // Embed.message = msg;
        return emitter;
    }
    setFancy(user: User) {
        user = user || this.messageOrInteraction?.member?.user;
        return this.setAuthor({ name: user.tag, iconURL: user.avatarURL()! });
    }
    setGuildFancy(guild: Guild) {
        guild = guild || this.messageOrInteraction?.guild;
        return this.setAuthor({ name: guild.name, iconURL: guild.iconURL()! })
    }
}
