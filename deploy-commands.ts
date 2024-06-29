// Load slash commands
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ApplicationCommandPermissionType, ApplicationCommandPermissions, Client, PermissionFlags, PermissionFlagsBits } from 'discord.js';
import fs from 'fs';
import path from 'path';

import { discordToken, clientID, mainServer, roles, staffServer } from './config.json';
import { SlashCommand } from './packages/bot/src/types/command/SlashCommand';
const bot = new Client({ intents: ["Guilds"], });
bot.login(discordToken);
bot.on("ready", async () => {
    console.log("Bot is ready");

    const rest = new REST({ version: '9' }).setToken(discordToken);

    const guild = bot.guilds.cache.get(mainServer);
    const staffGuild = bot.guilds.cache.get(staffServer);
    if (!guild) return console.error("Main server not found?");
    const commandsJSON: any[] = [];
    const commands: SlashCommand[] = [];
    const commandFiles = getAllFiles('./packages/bot/src/commands').filter(file => file.endsWith('.slash.ts'));

    for (const file of commandFiles) {
        const command: { new(): SlashCommand } = (await import(`./${file}`))?.default;
        const commandToLoad = new command();
        if (!commandToLoad.slash) {
            commandsJSON.push({ name: commandToLoad.name, description: "this command has not been properly initialized" });
            console.log(`/${commandToLoad.name.padEnd(20, " .")} (no slash)`)
        }
        else {
            const json = commandToLoad.getSlashCommandJSON();
            commandsJSON.push(json);
            commands.push(commandToLoad);
            console.log(`/${commandToLoad.name.padEnd(20, " .")} Subcommands: ${json.options?.map(e => e.name)}`)
        }

    }

    console.log('Reloading slash commands...');
    const cmds = await guild.commands.set(commandsJSON);
    await staffGuild?.commands.set(commandsJSON);
    if (staffGuild) console.log(`Reloaded commands in staff server`);
    console.log('Reloaded slash commands! Setting permissions of commands...');
    console.log('Ending process...');
    process.exit(0);
})


function getAllFiles(dirPath, arrayOfFiles?) {
    const files = fs.readdirSync(dirPath)
    arrayOfFiles = arrayOfFiles || []
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
        else arrayOfFiles.push(path.join(dirPath, "/", file))
    })
    return arrayOfFiles
}