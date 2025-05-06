const { SlashCommandBuilder } = require('discord.js');
const { addSubmission, hasSubmitted } = require('../../trackers/db');  // Importing the necessary database functions

module.exports = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit your art for the contest')
    .addStringOption(option =>
      option.setName('username')
        .setDescription('Your username')
        .setRequired(true))  // Make username required
    .addAttachmentOption(option =>
      option.setName('image')
        .setDescription('Upload your artwork')
        .setRequired(true)),  // Make image required

  async execute(interaction) {
    // Check if interaction has already been deferred
    if (!interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    const username = interaction.options.getString('username');  // Get the provided username
    const imageUrl = interaction.options.getAttachment('image').url;  // Get the uploaded image URL

    try {
      // Check if the user has already submitted
      if (await hasSubmitted(username)) {
        if (!interaction.replied) {
          await interaction.editReply('❌ You have already submitted your art for this contest!');
        }
        return;
      }

      // Add submission to the database
      await addSubmission(username, imageUrl);

      // Send confirmation message
      if (!interaction.replied) {
        await interaction.editReply('✅ Your submission has been saved! Good luck!');
      }
    } catch (err) {
      console.error('❌ Error in /submit:', err);
      if (!interaction.replied) {
        await interaction.editReply('❌ Failed to submit your art. Please try again.');
      }
    }
  },
};

