const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Announce a new contest')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('Title of the contest')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('description')
        .setDescription('Description of the contest')
        .setRequired(true)),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');

    const embed = new EmbedBuilder()
      .setTitle(`🎨 ${title}`)
      .setDescription(description)
      .setColor(0xffcc00)
      .setTimestamp();

    try {
      await interaction.channel.send({ embeds: [embed] });

      await interaction.editReply({
        content: '📢 Contest announcement posted!',
      });
    } catch (err) {
      console.error('❌ Error in /announce:', err);
      await interaction.editReply({
        content: '❌ Failed to post announcement. Please try again.',
      });
    }
  },
};

