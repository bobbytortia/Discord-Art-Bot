const { SlashCommandBuilder } = require('discord.js');
const { addSubmission, hasSubmitted } = require('../../trackers/db');  // Importing the necessary database functions

module.exports = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit your art for the contest')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your username (optional, defaults to your Discord username)')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Upload your artwork')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });  // Defers reply to avoid timeout

    const username = interaction.options.getString('username') || interaction.user.username;  // Get the provided or default username
    const imageUrl = interaction.options.getAttachment('image').url;  // Get the uploaded image URL

    try {
      // Check if the user has already submitted
      if (await hasSubmitted(username)) {
        return interaction.editReply('❌ You have already submitted your art for this contest!');
      }

      // Add submission to the database
      await addSubmission(username, imageUrl);

      // Send confirmation message
      await interaction.editReply('✅ Your submission has been saved! Good luck!');
    } catch (err) {
      console.error('❌ Error in /submit:', err);
      await interaction.editReply('❌ Failed to submit your art. Please try again.');
    }
  },
};
