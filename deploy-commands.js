const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { token, clientId } = require('./config.json');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

const loadCommands = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.lstatSync(filePath);
    if (stat.isDirectory()) {
      loadCommands(filePath); // 🔁 Recurse
    } else if (file.endsWith('.js')) {
      try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
          console.log(`✅ Loaded: ${command.data.name}`);
        } else {
          console.warn(`⚠️ Skipped ${filePath}: Missing "data" or "execute"`);
        }
      } catch (error) {
        console.error(`❌ Failed to load ${filePath}:`, error);
      }
    }
  }
};

loadCommands(commandsPath);

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    const guildId = '596908408255545354'; // Replace with your guild ID
    console.log(`📡 Deploying ${commands.length} commands to ${guildId}...`);
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );
    console.log(`✅ Deployed ${data.length} commands to ${guildId}.`);
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
