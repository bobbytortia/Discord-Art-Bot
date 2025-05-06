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
    try {
      // Only defer if not already replied or deferred
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');

      const embed = new EmbedBuilder()
        .setTitle(`🎨 ${title}`)
        .setDescription(description)
        .setColor(0xffcc00)
        .setTimestamp();

      // Send to a specific channel (recommended) or fallback to current
      const channelId = process.env.ANNOUNCE_CHANNEL_ID; // optional env var
      const targetChannel = channelId 
        ? interaction.client.channels.cache.get(channelId)
        : interaction.channel;

      if (!targetChannel) {
        throw new Error('Target channel not found.');
      }

      await targetChannel.send({ embeds: [embed] });

      await interaction.editReply({
        content: '📢 Contest announcement posted!',
      });

    } catch (err) {
      console.error('❌ Error in /announce:', err);
      if (!interaction.replied) {
        await interaction.editReply({
          content: '❌ Failed to post announcement. Please check the bot\'s permissions and try again.',
        });
      }
    }
  },
};


