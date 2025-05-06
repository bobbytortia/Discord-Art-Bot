const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { clearSubmissions } = require('../../trackers/db.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel-contest')
    .setDescription('Cancel the current contest and delete all submissions.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await clearSubmissions();
    await interaction.reply({ content: '⚠️ All contest submissions have been deleted.', ephemeral: true });
  }
};
