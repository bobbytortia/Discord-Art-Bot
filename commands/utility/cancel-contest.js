const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel the current contest'),

  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      // TODO: Your logic to cancel the contest (e.g., update DB, clear cache, etc.)
      console.log('❌ Contest cancelled (stub logic)');

      await interaction.editReply({
        content: '❌ Contest has been cancelled.',
      });

    } catch (err) {
      console.error('❌ Error in /cancel:', err);
      if (!interaction.replied) {
        await interaction.editReply({
          content: '❌ Failed to cancel contest. Please try again.',
        });
      }
    }
  },
};
