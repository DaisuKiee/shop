import Command from "../../structures/Command.js";
import PrefixData from "../../schemas/prefix.js";

export default class Prefix extends Command {
    constructor(client) {
        super(client, {
            name: 'prefix',
            description: {
                content: 'Change the prefix of the bot',
                usage: '<new prefix>',
                examples: ['prefix !'],
            },
            aliases: ['setprefix'],
            category: 'config',
            cooldown: 3,
            args: true,
            permissions: {
                dev: false,
                client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
                user: ['ManageGuild'],
            },
            slashCommand: true,
            options: [
                {
                    name: "prefix",
                    description: "The new prefix",
                    type: 3,
                    required: true,
                },
            ]
        });
    }
    async run(ctx, args) {
        const prefix = args.join(" ");

        if (args[0].length > 3) {
            const errorContainer = this.client.container()
                .setAccentColor(this.client.color.error)
                .addTextDisplayComponents(this.client.textDisplay("Your new prefix must be under `3` characters!"));
            return ctx.sendMessage({ components: [errorContainer], flags: ['IsComponentsV2'] });
        }

        let data = await PrefixData.findOne({ _id: ctx.guild.id });
        if (!data) {
            data = new PrefixData({
                _id: ctx.guild.id,
                prefix: prefix,
            });
            await data.save();
            const container = this.client.container()
                .setAccentColor(this.client.color.success)
                .addTextDisplayComponents(this.client.textDisplay(`✅ Set the prefix to \`${prefix}\``));
            return ctx.sendMessage({ components: [container], flags: ['IsComponentsV2'] });
        } else {
            data.prefix = prefix;
            await data.save();
            const container = this.client.container()
                .setAccentColor(this.client.color.success)
                .addTextDisplayComponents(this.client.textDisplay(`✅ Updated the prefix to \`${prefix}\``));
            return ctx.sendMessage({ components: [container], flags: ['IsComponentsV2'] });
        }
    }
}