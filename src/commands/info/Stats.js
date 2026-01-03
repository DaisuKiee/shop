import Command from "../../structures/Command.js";
import { version } from 'discord.js';
import os from 'os';

export default class Stats extends Command {
    constructor(client) {
        super(client, {
            name: 'stats',
            description: {
                content: 'Display bot statistics.',
                usage: 'stats',
                examples: ['stats'],
            },
            aliases: ['statistics', 'botstat'],
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
        const totalSeconds = Math.floor(this.client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = totalSeconds % 60;
        
        const uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        
        const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        
        const container = this.client.container()
            .setAccentColor(this.client.color.default)
            .addSectionComponents(
                this.client.section()
                    .addTextDisplayComponents(this.client.textDisplay('## 📊 Bot Statistics'))
                    .setThumbnailAccessory(this.client.thumbnail(this.client.user.displayAvatarURL()))
            )
            .addSeparatorComponents(this.client.separator())
            .addTextDisplayComponents(
                this.client.textDisplay(`### 🤖 Bot Information\n\`\`\`yml\nServers: ${this.client.guilds.cache.size}\nUsers: ${this.client.users.cache.size}\nChannels: ${this.client.channels.cache.size}\nCommands: ${this.client.commands.size}\`\`\``)
            )
            .addTextDisplayComponents(
                this.client.textDisplay(`### ⏰ Uptime\n\`\`\`yml\n${uptime}\`\`\``)
            )
            .addTextDisplayComponents(
                this.client.textDisplay(`### 🏓 Ping\n\`\`\`yml\nWS: ${Math.round(this.client.ws.ping)}ms\`\`\``)
            )
            .addTextDisplayComponents(
                this.client.textDisplay(`### 💾 Memory\n\`\`\`yml\nUsed: ${memoryUsage} MB\nFree: ${freeMemory} GB\nTotal: ${totalMemory} GB\`\`\``)
            )
            .addTextDisplayComponents(
                this.client.textDisplay(`### 🖥️ System\n\`\`\`yml\nPlatform: ${os.platform()}\nCPU Cores: ${os.cpus().length}\nNode.js: ${process.version}\nDiscord.js: v${version}\`\`\``)
            )
            .addSeparatorComponents(this.client.separator())
            .addTextDisplayComponents(
                this.client.textDisplay(`-# Requested by ${ctx.author.tag}`)
            );
        
        return ctx.sendMessage({ components: [container], flags: ['IsComponentsV2'] });
    }
}
