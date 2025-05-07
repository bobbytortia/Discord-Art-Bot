const { Client, Collection, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { initDB } = require('./trackers/db');
const express = require('express');
const app = express();
const fetch = require('node-fetch');

// Health check endpoints
app.get('/', (req, res) => {
  res.status(200).send('Bot is running!');
});
app.get('/ping', (req, res) => {
  res.status(200).send('Bot is active!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server listening on port ${PORT}`);
});

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
function getAllCommandFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllCommandFiles(fullPath, arrayOfFiles);
    } else if (file.endsWith('.js')) {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

const commandFiles = getAllCommandFiles(commandsPath);
for (const filePath of commandFiles) {
  try {
    const command = require(filePath);
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
      console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
      console.warn(`⚠️ Skipping invalid command file: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error loading command ${filePath}:`, error);
  }
}

// Load event handlers
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  try {
    const event = require(filePath);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  } catch (error) {
    console.error(`❌ Error loading event ${filePath}:`, error);
  }
}



// Self-ping every 2 minutes
setInterval(async () => {
  try {
    const response = await fetch(`https://${process.env.WEBSITE_HOSTNAME}/ping`);
    if (response.ok) {
      console.log('✅ Self-ping successful');
    } else {
      console.warn('⚠️ Self-ping failed:', response.status);
    }
  } catch (error) {
    console.error('❌ Self-ping error:', error);
  }
}, 120000); // 2 minutes

// Bot ready
client.once('ready', async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    await initDB(); // DB setup
    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
  console.error('❌ Failed to login to Discord:', error);
});