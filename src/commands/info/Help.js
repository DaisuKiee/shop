import Command from "../../structures/Command.js";

export default class Help extends Command {
    constructor(client) {
        super(client, {
            name: 'help',
            description: {
                content: 'Display all commands available to you.',
                usage: '[command]',
                examples: ['help', 'help ping'],
            },
            aliases: ['h', 'commands'],
            category: 'info',
            cooldown: 3,
            permissions: {
                dev: false,
                client: ['SendMessages', 'ViewChannel', 'EmbedLinks'],
                user: [],
            },
            slashCommand: true,
            options: [
                {
                    name: "command",
                    description: "Get info on a specific command",
                    type: 3,
                    required: false,
                },
            ]
        });
    }

    async run(ctx, args) {
        if (args[0]) {
            const command = this.client.commands.get(args[0].toLowerCase()) || 
                           this.client.commands.get(this.client.aliases.get(args[0].toLowerCase()));
            
            if (!command) {
                const errorContainer = this.client.container()
                    .setAccentColor(this.client.color.error)
                    .addTextDisplayComponents(this.client.textDisplay(`❌ Command \`${args[0]}\` not found.`));
                return ctx.sendMessage({ components: [errorContainer], flags: ['IsComponentsV2'] });
            }
            
            const container = this.client.container()
                .setAccentColor(this.client.color.default)
                .addTextDisplayComponents(this.client.textDisplay(`## 📖 Command: ${command.name}`))
                .addTextDisplayComponents(this.client.textDisplay(command.description.content || 'No description available.'))
                .addSeparatorComponents(this.client.separator())
                .addTextDisplayComponents(this.client.textDisplay(`📝 **Usage:** \`${this.client.config.prefix}${command.name} ${command.description.usage || ''}\``))
                .addTextDisplayComponents(this.client.textDisplay(`🏷️ **Aliases:** ${command.aliases.length ? command.aliases.map(a => `\`${a}\``).join(', ') : 'None'}`))
                .addTextDisplayComponents(this.client.textDisplay(`📂 **Category:** ${command.category || 'None'}`))
                .addTextDisplayComponents(this.client.textDisplay(`⏱️ **Cooldown:** ${command.cooldown || 3}s`));
                
            if (command.description.examples && command.description.examples.length) {
                container.addSeparatorComponents(this.client.separator())
                    .addTextDisplayComponents(this.client.textDisplay(`💡 **Examples:**\n${command.description.examples.map(ex => `\`${this.client.config.prefix}${ex}\``).join('\n')}`));
            }
            
            return ctx.sendMessage({ components: [container], flags: ['IsComponentsV2'] });
        }
        
        const categories = {};
        this.client.commands.forEach(cmd => {
            if (!categories[cmd.category]) categories[cmd.category] = [];
            categories[cmd.category].push(cmd.name);
        });
        
        const container = this.client.container()
            .setAccentColor(this.client.color.default)
            .addSectionComponents(
                this.client.section()
                    .addTextDisplayComponents(this.client.textDisplay('## 📚 Help Menu'))
                    .setThumbnailAccessory(this.client.thumbnail(this.client.user.displayAvatarURL()))
            )
            .addTextDisplayComponents(this.client.textDisplay(`Use \`${this.client.config.prefix}help [command]\` for more info on a command.`))
            .addSeparatorComponents(this.client.separator());
        
        for (const [category, commands] of Object.entries(categories)) {
            container.addTextDisplayComponents(
                this.client.textDisplay(`### ${category.charAt(0).toUpperCase() + category.slice(1)}\n${commands.map(c => `\`${c}\``).join(', ')}`)
            );
        }
        
        container.addSeparatorComponents(this.client.separator())
            .addTextDisplayComponents(this.client.textDisplay(`-# Total Commands: ${this.client.commands.size}`));
        
        return ctx.sendMessage({ components: [container], flags: ['IsComponentsV2'] });
    }
}
