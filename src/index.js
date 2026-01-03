import { BotClient } from "./structures/Client.js";
import { startWebServer } from "./web/server.js";

const client = new BotClient();

(async () => {
    await client.start();
    
    // Start web server after bot is ready
    client.once('ready', () => {
        startWebServer(client, process.env.PORT || 3000);
    });
})();

export default client;