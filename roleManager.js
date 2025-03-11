module.exports = {
    createVoiceModRole: async function (client, guildId) {
        try {
            const guild = await client.guilds.fetch(guildId);
            const role = guild.roles.cache.find(role => role.name === 'Voice moderator');

            if (!role) {
                await guild.roles.create({
                    name: 'Voice moderator',
                    color: 0x00FF00,
                    permissions: ['Administrator']
                });
                console.log('Created new role Voice moderator.');
            } else {
                console.log('Voice moderator role already exists.');
            }
        } catch (error) {
            console.error(error);
        }
    }
};