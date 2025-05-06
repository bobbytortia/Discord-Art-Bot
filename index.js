const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { initDB } = require('./trackers/db');
require('./keepAlive');


const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Setup command collection
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
}

// When bot is ready
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await initDB(); // <-- DB Initialization
});

// Handle interactions
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: '⚠️ Error executing command.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
