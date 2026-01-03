import Command from "../../structures/Command.js"; 

export default class About extends Command {
    constructor(client) {
        super(client, {
            name: 'about',
            description: {
                content: 'See information about this bot.',
                usage: 'about',
                examples: ['about'],
            },
            aliases: ["info", "botinfo"],
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
        const container = this.client.container()
            .setAccentColor(this.client.color.default)
            .addSectionComponents(
                this.client.section()
                    .addTextDisplayComponents(this.client.textDisplay('## Bot Information'))
                    .setThumbnailAccessory(this.client.thumbnail(this.client.user.displayAvatarURL()))
            )
            .addSeparatorComponents(this.client.separator())
            .addTextDisplayComponents(
                this.client.textDisplay(`👤 **Bot Name:** ${this.client.user.tag}\n📊 **Servers:** ${this.client.guilds.cache.size}\n👥 **Users:** ${this.client.users.cache.size}`)
            )
            .addTextDisplayComponents(
                this.client.textDisplay(`📝 **Commands:** ${this.client.commands.size}\n🏓 **Ping:** ${Math.round(this.client.ws.ping)}ms\n⏱️ **Uptime:** <t:${Math.floor((Date.now() - this.client.uptime) / 1000)}:R>`)
            )
            .addTextDisplayComponents(
                this.client.textDisplay(`💻 **Node.js:** ${process.version}\n📚 **Discord.js:** v14.22.1\n🔧 **Prefix:** ${this.client.config.prefix}`)
            )
            .addSeparatorComponents(this.client.separator())
            .addTextDisplayComponents(
                this.client.textDisplay(`-# Requested by ${ctx.author.tag}`)
            );
            
        return await ctx.sendMessage({ components: [container], flags: ['IsComponentsV2'] });
    }
}
