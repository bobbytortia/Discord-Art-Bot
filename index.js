const { Client, Collection, GatewayIntentBits } = require('discord.js');
     const fs = require('fs');
     const path = require('path');
     const express = require('express');
     const fetch = require('node-fetch');
     require('dotenv').config();
     const { initDB } = require('./trackers/db');

     const app = express();

     // Serve static files
     app.use(express.static(path.join(__dirname, 'public')));

     // Health check endpoints
     app.get('/', (req, res) => {
       res.sendFile(path.join(__dirname, 'public', 'index.html'));
     });

     app.get('/ping', async (req, res) => {
       try {
         if (dbClient) {
           await dbClient.from('submissions').select('id').limit(1);
         }
         let sum = 0;
         for (let i = 0; i < 10000; i++) sum += i;
         res.status(200).send(`Bot is active! Sum: ${sum}`);
       } catch (error) {
         console.error('❌ Ping endpoint error:', error);
         res.status(500).send('Ping failed');
       }
     });

     // Self-ping every 2 minutes
     let dbClient;
     async function initializeDatabase() {
       try {
         dbClient = await initDB();
         console.log('✅ Database ready for health checks');
       } catch (error) {
         console.error('❌ Database initialization failed:', error);
       }
     }
     initializeDatabase();

     setInterval(async () => {
       try {
         const hostname = process.env.APP_HOSTNAME || 'discord-art-bot-fvdsfuheb6bpdje6.canadacentral-01.azurewebsites.net';
         const response = await fetch(`https://${hostname}/ping`);
         if (response.ok) {
           console.log('✅ Self-ping successful');
         } else {
           console.warn('⚠️ Self-ping failed:', response.status);
         }
       } catch (error) {
         console.error('❌ Self-ping error:', error);
       }
     }, 120000);

     const PORT = process.env.PORT || 3000;
     app.listen(PORT, () => {
       console.log(`🌐 Web server listening on port ${PORT}`);
     });

     const client = new Client({ intents: [GatewayIntentBits.Guilds] });

     client.on('error', (error) => {
       console.error('❌ WebSocket error:', error);
     });

     client.on('shardDisconnect', (event, id) => {
       console.warn(`⚠️ Shard ${id} disconnected: ${event.code} - ${event.reason}`);
     });

     client.on('shardReconnecting', (id) => {
       console.log(`🔄 Shard ${id} reconnecting...`);
     });

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

     client.once('ready', async () => {
       console.log(`✅ Logged in as ${client.user.tag}`);
     });

     process.on('uncaughtException', (error) => {
       console.error('❌ Uncaught Exception:', error);
     });

     process.on('unhandledRejection', (reason, promise) => {
       console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
     });

     client.login(process.env.DISCORD_TOKEN).catch(error => {
       console.error('❌ Failed to login to Discord:', error);
     });