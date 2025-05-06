const { SlashCommandBuilder } = require('discord.js');
const { pool } = require('../../trackers/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel the current contest and clear submissions'),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      await pool.query('DELETE FROM submissions');

      await interaction.editReply({
        content: '🗑️ Contest has been cancelled and all submissions cleared.',
      });
    } catch (err) {
      console.error('❌ Error in /cancel:', err);
      await interaction.editReply({
        content: '❌ Failed to cancel the contest. Please try again later.',
      });
    }
  },
};
