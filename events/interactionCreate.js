const { activeEvents } = require('../trackers/voteTracker');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    console.log('Interaction received:', interaction.type);

    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command) {
        console.log(`Command not found: ${interaction.commandName}`);
        return;
      }

      try {
        console.log(`Executing command: ${interaction.commandName}`);

        // Immediately acknowledge the interaction to avoid the 3-second timeout
        await interaction.deferReply();

        // Now, execute the command
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        try {
          await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } catch (replyError) {
          console.error('Failed to send error reply:', replyError);
        }
      }
      return;
    }

    // Handle button interactions
    if (interaction.isButton()) {
      // Handle cancel event button
      if (interaction.customId === 'cancel_event') {
        const event = activeEvents.get(interaction.message.id);
        if (!event) {
          await interaction.reply({ content: '❌ This event no longer exists.', ephemeral: true });
          return;
        }

        if (interaction.user.id !== event.organizerId) {
          await interaction.reply({ content: '❌ Only the event organizer can cancel this event.', ephemeral: true });
          return;
        }

        try {
          if (event.lastResponseMessageId) {
            try {
              const lastResponse = await interaction.channel.messages.fetch(event.lastResponseMessageId);
              await lastResponse.delete();
              console.log(`Deleted last response message: ${event.lastResponseMessageId}`);
            } catch (deleteError) {
              console.error(`Failed to delete last response message ${event.lastResponseMessageId}:`, deleteError);
            }
          }

          activeEvents.delete(interaction.message.id);
          console.log(`Removed event from activeEvents: ${interaction.message.id}`);
          await interaction.message.delete();
          console.log('Deleted event message.');
          await interaction.channel.send(`❌ The event organized by ${interaction.user} has been canceled.`);
        } catch (error) {
          console.error('Error canceling event:', error);
          await interaction.reply({ content: '❌ Failed to cancel the event. Please try again later.', ephemeral: true });
        }
        return;
      }
    }
  },
};
