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
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        try {
          if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
          } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
          }
        } catch (replyError) {
          console.error('Failed to send error reply:', replyError);
        }
      }
      return;
    }

    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'event_poll') {
        const event = activeEvents.get(interaction.message.id);
        if (!event) return;

        event.votes.set(interaction.user.id, interaction.values[0]);

        const voteSummary = {
          yes: [],
          no: [],
          maybe: []
        };

        for (const [userId, vote] of event.votes.entries()) {
          voteSummary[vote].push(`<@${userId}>`);
        }

        const summaryMessage = `📊 **Current Responses:**
✅ Can make it: ${voteSummary.yes.join(', ') || 'None'}
❌ Can’t make it: ${voteSummary.no.join(', ') || 'None'}
🤷 Unsure: ${voteSummary.maybe.join(', ') || 'None'}
`;

        try {
          if (event.lastResponseMessageId) {
            try {
              const previousMessage = await interaction.channel.messages.fetch(event.lastResponseMessageId);
              await previousMessage.delete();
              console.log(`Deleted previous response message: ${event.lastResponseMessageId}`);
            } catch (deleteError) {
              console.error(`Failed to delete previous message ${event.lastResponseMessageId}:`, deleteError);
            }
          }

          const newResponse = await interaction.reply({
            content: `${interaction.user} voted: **${interaction.values[0]}**\n\n${summaryMessage}`,
            fetchReply: true
          });

          event.lastResponseMessageId = newResponse.id;
          activeEvents.set(interaction.message.id, event);
          console.log(`Posted new response message: ${newResponse.id}`);
        } catch (error) {
          console.error('Error handling event poll response:', error);
          await interaction.reply({ content: '❌ Failed to update the poll response.', ephemeral: true });
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

      // Handle roll again button
      if (interaction.customId.startsWith('roll_again_')) {
        try {
          // Extract max from the customId
          const [, , max] = interaction.customId.split('_');
          const min = 1;
          const maxNum = parseInt(max);

          // Validate the range
          if (isNaN(maxNum) || min > maxNum) {
            await interaction.reply({ content: '❌ Invalid range for reroll.', ephemeral: true });
            return;
          }

          // Roll a new random number
          const roll = Math.floor(Math.random() * (maxNum - min + 1)) + min;

          // Recreate the roll again button
          const rollAgainButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`roll_again_${maxNum}`)
              .setLabel('Roll Again')
              .setStyle(ButtonStyle.Primary)
          );

          // Update the message with the new roll
          await interaction.update({
            content: `🎲 You rolled a **${roll}** (range: ${min} to ${maxNum})!`,
            components: [rollAgainButton]
          });
        } catch (error) {
          console.error('Error in roll again button:', error);
          await interaction.reply({ content: '❌ Failed to reroll the dice. Please try again later.', ephemeral: true });
        }
      }
    }
  },
};