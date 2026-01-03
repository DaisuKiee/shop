import Command from "../../structures/Command.js"; 

export default class Ping extends Command {
    constructor(client) {
        super(client, {
            name: 'ping',
            description: {
                content: 'Check the bot\'s latency and response time.',
                usage: 'ping',
                examples: ['ping'],
            },
            category: 'info',
            cooldown: 3,
            permissions: {
                dev: false,
                client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
                user: [],
            },
            slashCommand: true,
        });
    }
    async run(ctx, args) {
        const msg = await ctx.sendDeferMessage('Pinging...');

        const container = this.client.container()
            .setAccentColor(this.client.color.success)
            .addSectionComponents(
                this.client.section()
                    .addTextDisplayComponents(this.client.textDisplay('## 🏓 Pong!'))
                    .setThumbnailAccessory(this.client.thumbnail(this.client.user.displayAvatarURL()))
            )
            .addSeparatorComponents(this.client.separator())
            .addTextDisplayComponents(
                this.client.textDisplay(`### Bot Latency\n\`\`\`ini\n[ ${msg.createdTimestamp - ctx.createdTimestamp}ms ]\n\`\`\``)
            )
            .addTextDisplayComponents(
                this.client.textDisplay(`### API Latency\n\`\`\`ini\n[ ${Math.round(ctx.client.ws.ping)}ms ]\n\`\`\``)
            )
            .addSeparatorComponents(this.client.separator())
            .addTextDisplayComponents(
                this.client.textDisplay(`-# Requested by ${ctx.author.tag}`)
            );
        
        return await ctx.editMessage({ content: '', components: [container], flags: ['IsComponentsV2'] });
    }
}
