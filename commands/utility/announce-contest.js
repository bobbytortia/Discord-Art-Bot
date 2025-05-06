const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('announce-contest')
    .setDescription('Announce a new art contest to the server.')
    .addStringOption(opt =>
      opt.setName('description').setDescription('Details about the contest').setRequired(true))
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Where to post the announcement').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Admin only
  
  async execute(interaction) {
    const description = interaction.options.getString('description');
    const channel = interaction.options.getChannel('channel');

    const embed = new EmbedBuilder()
      .setTitle('🎨 New Art Contest!')
      .setDescription(`${description}\n\nUse the **/submit** command to enter.\n🔸 One entry per person\n🔸 Submit a Twitch or YouTube name + your art image.`)
      .setColor('Blurple')
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.reply({ content: `✅ Contest announcement sent to ${channel}`, ephemeral: true });
  }
};
