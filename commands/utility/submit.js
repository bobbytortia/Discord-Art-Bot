const { SlashCommandBuilder } = require('discord.js');
const { pool } = require('../../trackers/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit your art entry')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your Twitch or YouTube name')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('art')
        .setDescription('Upload your art image')
        .setRequired(true)),
  
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const username = interaction.options.getString('username');
    const art = interaction.options.getAttachment('art');

    try {
      await pool.query(
        'INSERT INTO submissions (discord_id, username, art_url) VALUES ($1, $2, $3)',
        [interaction.user.id, username, art.url]
      );

      await interaction.editReply({
        content: '✅ Your art has been submitted successfully!',
      });
    } catch (err) {
      console.error('❌ Error in /submit:', err);
      await interaction.editReply({
        content: '❌ There was an error submitting your art. Please try again later.',
      });
    }
  },
};
