const { SlashCommandBuilder } = require('discord.js');
const { addSubmission, hasSubmitted, supabase } = require('../../trackers/db');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit your art for the contest')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Your username')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Upload your artwork')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        const username = interaction.options.getString('username');
        const imageAttachment = interaction.options.getAttachment('image');

        try {
            if (await hasSubmitted(username)) {
                if (!interaction.replied) {
                    await interaction.editReply('❌ You have already submitted your art for this contest!');
                }
                return;
            }

            if (!imageAttachment.contentType || !imageAttachment.contentType.startsWith('image/')) {
                if (!interaction.replied) {
                    await interaction.editReply('❌ Please upload a valid image file.');
                }
                return;
            }

            if (imageAttachment.size > 5 * 1024 * 1024) {
                if (!interaction.replied) {
                    await interaction.editReply('❌ File is too large. Please upload an image smaller than 5MB.');
                }
                return;
            }

            const response = await fetch(imageAttachment.url);
            if (!response.ok) {
                throw new Error('Failed to download image from Discord');
            }
            const imageBuffer = await response.buffer();

            const fileExt = imageAttachment.name.split('.').pop();
            const fileName = `${username}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('art-submissions')
                .upload(fileName, imageBuffer, {
                    contentType: imageAttachment.contentType
                });

            if (uploadError) {
                console.error('Error uploading image to Supabase:', uploadError);
                if (!interaction.replied) {
                    await interaction.editReply('❌ Failed to upload your art. Please try again.');
                }
                return;
            }

            const { data: urlData } = supabase.storage
                .from('art-submissions')
                .getPublicUrl(fileName);

            const imageUrl = urlData.publicUrl;
            console.log('Uploaded image URL:', imageUrl);

            await addSubmission(username, imageUrl);

            if (!interaction.replied) {
                await interaction.editReply('✅ Your submission has been saved! Good luck!');
            }
        } catch (err) {
            console.error('❌ Error in /submit:', err.message);
            console.error('Stack:', err.stack);
            if (!interaction.replied) {
                await interaction.editReply('❌ Failed to submit your art. Please try again.');
            }
        }
    },
};