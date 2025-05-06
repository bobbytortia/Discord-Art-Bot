const { SlashCommandBuilder } = require('discord.js');
const { addSubmission, hasSubmitted } = require('../trackers/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('submit')
    .setDescription('Submit your art!')
    .addStringOption(opt =>
      opt.setName('username').setDescription('Your Twitch or YouTube name').setRequired(true))
    .addAttachmentOption(opt =>
      opt.setName('image').setDescription('Your art image').setRequired(true)),
  
  async execute(interaction) {
    const username = interaction.options.getString('username');
    const image = interaction.options.getAttachment('image');

    if (!image.contentType.startsWith('image/')) {
      return await interaction.reply({ content: '❌ That file is not an image.', ephemeral: true });
    }

    const alreadySubmitted = await hasSubmitted(username);
    if (alreadySubmitted) {
      return await interaction.reply({
        content: `🚫 You’ve already submitted, ${username}. One entry per contest!`,
        ephemeral: true
      });
    }

    await addSubmission(username, image.url);
    await interaction.reply({
      content: `🎨 Thanks, ${username}! Your submission has been received.`,
      ephemeral: true
    });
  }
};
