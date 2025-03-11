const { PermissionsBitField } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const fs = require('fs');
const path = require('path');

async function executeResetCommand(interaction, client, db) {
    try {
        let userMention = interaction.options.get('user').value;
        if (userMention) {
            const userId = userMention.slice(2, -1);
            const user = await client.users.fetch(userId);
            db.set(`user_penalty_points_${user.id}`, Number(0));
            interaction.reply(`User ${user.username}' penalty points have been reset.`);
        }
    } catch (error) {
        console.error(`An error occurred while executing the reset command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}


async function executeJoinCommand(interaction, GuildMember) {
    try {
        if (
            interaction.member instanceof GuildMember &&
            interaction.member.voice.channel
        ) {
            const channel = interaction.member.voice.channel;
            joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                selfDeaf: false,
                selfMute: true,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
            await interaction.reply("Joined voice channel.");
        } else {
            await interaction.reply("Join a voice channel and then try that again!");
        }
    } catch (error) {
        console.error(`An error occurred while executing the join command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}


async function executeLeaveCommand(interaction) {
    try {
        const connection = getVoiceConnection(interaction.guildId);
        if (connection) {
            connection.destroy();
            await interaction.reply("Left voice channel");
        } else {
            await interaction.reply("Bot isn't in voice channel!");
        }
    } catch (error) {
        console.error(`An error occurred while executing the leave command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}

async function executeInspectCommand(interaction, userMention, db, client) {
    try {
        if (userMention) {
            const userId = userMention.slice(2, -1);
            const user = await client.users.fetch(userId);
            let userPenaltyPoints = await db.get(`user_penalty_points_${user.id}`);
            if (userPenaltyPoints === null) {
                db.set(`user_penalty_points_${user.id}`, Number(0));
                userPenaltyPoints = 0;
            }
            interaction.reply(`User ${user.username} has ${userPenaltyPoints} penalty points.`);
        }
    } catch (error) {
        console.error(`An error occurred while executing the inspect command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}


async function executeCheckCommand(interaction) {
    try {
        let audioID = interaction.options.get('value').value;

        const user = interaction.user;
        const audioFilePath = `reports/${audioID}.mp3`;

        if (fs.existsSync(audioFilePath)) {
            const audioFileData = fs.readFileSync(audioFilePath);

            const logsFilePath = 'logs.txt';
            const logsFileData = await fs.promises.readFile(logsFilePath, 'utf-8');

            const logLine = logsFileData.split('\n').find(line => line.includes(audioID));

            const messageContent = logLine ? `Report ID:\n${logLine}` : `ID: ${audioID} (lack of information in logs.txt)`;

            user.send({
                content: messageContent,
                files: [{
                    attachment: audioFileData,
                    name: `${audioID}.mp3`
                }]
            })
                .then(() => {
                    interaction.reply(`The file and entry were successfully sent to ${user.tag}`);
                })
                .catch(error => {
                    console.error(`An error occurred while sending a file to ${user.tag}: ${error}`);
                    interaction.reply(`Something went wrong!`);
                });
        } else {
            console.error(`File ${audioFilePath} does not exists.`);
            interaction.reply(`File does not exists.`);
        }
    } catch (error) {
        console.error(`An error occurred while executing the check command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}


async function executeWarnCommand(interaction, client, db) {
    try {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            await interaction.reply('You have no access to this command.');
        } else {
            let userMention = interaction.options.get('user').value;
            let value = interaction.options.get('value').value;
            if (isNaN(value) || !Number.isInteger(Number(value))) {
                interaction.reply("Value has to be a number.");
            } else if (userMention) {
                let userId = userMention.slice(2, -1);
                let user = await client.users.fetch(userId);

                let userPenaltyPoints = await db.add(`user_penalty_points_${user.id}`, Number(value));
                interaction.reply(`User ${user.username} were correctly warned. User has ${userPenaltyPoints} penalty points.`);
            }
        }
    } catch (error) {
        console.error(`An error occurred while executing the warn command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}


async function executeDecreaseCommand(interaction, client, db) {
    try {
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            await interaction.reply('You have no access to this command.');
        } else {
            let userMention = interaction.options.get('user').value;
            let value = interaction.options.get('value').value;
            if (isNaN(value) || !Number.isInteger(Number(value))) {
                interaction.reply("Value has to be a number.");
            } else if (userMention) {
                let userId = userMention.slice(2, -1);
                let user = await client.users.fetch(userId);
                let userPenaltyPoints = await db.get(`user_penalty_points_${user.id}`);
                userPenaltyPoints -= Number(value);
                if (userPenaltyPoints < 0) userPenaltyPoints = 0;
                db.set(`user_penalty_points_${user.id}`, userPenaltyPoints);
                interaction.reply(`User ${user.username} penalty points were correctly decreased. User has ${userPenaltyPoints} penalty points.`);
            }
        }
    } catch (error) {
        console.error(`An error occurred while executing the decrease command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}


async function executeModListCommand(interaction) {
    try {
        let role = interaction.guild.roles.cache.find(role => role.name === 'Voice moderator');
        let adminNames = [];

        if (role) {
            role.members.forEach(member => {
                adminNames.push(member.displayName);
            });
        }

        if (adminNames.length > 0) {
            await interaction.reply(`Voice moderator list: ${adminNames.join(', ')}`);
        } else {
            await interaction.reply('There are no voice moderators on this server.');
        }
    } catch (error) {
        console.error(`An error occurred while executing the mod list command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}


async function executeSpeechFilterCommand(interaction) {
    try {
        let speechMode = interaction.options.get('modes').value;
        await interaction.reply(`Set speech recognition mode to ${speechMode}`);
        return speechMode;
    } catch (error) {
        console.error(`An error occurred while executing the speech filter command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}

async function executeSetAPICommand(interaction) {
    try {
        let API = interaction.options.get('api').value;
        await interaction.reply(`Set speech API to ${API}`);
        return API;
    } catch (error) {
        console.error(`An error occurred while executing the set API command: ${error}`);
        await interaction.reply("Something went wrong!");
    }
}

 
async function executeReportCommand(interaction) {
    try {
        let reportID = interaction.options.get('value').value;
        let sourceDirectory = './records';
        let targetDirectory = './reports';

        let userIdFromReport = reportID.slice(14);

        console.log(interaction.user.id);
        console.log(userIdFromReport);

        if (interaction.user.id !== userIdFromReport) {
            await interaction.reply(`Incorrect ID!`);
            return;
        }

        let sourceFile = path.join(sourceDirectory, reportID + '.mp3');
        let targetFile = path.join(targetDirectory, reportID + '.mp3');

        fs.renameSync(sourceFile, targetFile);
        console.log(`File ${reportID}.mp3 was moved to ./report.`);


        await interaction.reply(`Successfully reported`);
    } catch (error) {
        await interaction.reply(`Something went wrong.`);
        console.error(`Error occurred: ${error}`);
    }
}

module.exports = {
    executeResetCommand,
    executeJoinCommand,
    executeLeaveCommand,
    executeInspectCommand,
    executeCheckCommand,
    executeWarnCommand,
    executeDecreaseCommand,
    executeModListCommand,
    executeSpeechFilterCommand,
    executeReportCommand,
    executeSetAPICommand
};