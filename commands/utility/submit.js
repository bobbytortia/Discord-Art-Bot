const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { saveSubmission } = require('../../trackers/db'); // Adjust if your DB path is different

module.exports = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit your art to the contest')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your Twitch or YouTube username')
        .setRequired(true))
    .addAttachmentOption(option =>
      option.setName('art')
        .setDescription('Your artwork image')
        .setRequired(true)),

  async execute(interaction) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const username = interaction.options.getString('username');
      const art = interaction.options.getAttachment('art');

      // Save submission to DB
      await saveSubmission(username, art.url);

      await interaction.editReply({
        content: '✅ Your artwork has been submitted successfully!',
      });

    } catch (err) {
      console.error('❌ Error in /submit:', err);
      if (!interaction.replied) {
        await interaction.editReply({
          content: '❌ Failed to submit artwork. Please try again.',
        });
      }
    }
  },
};
