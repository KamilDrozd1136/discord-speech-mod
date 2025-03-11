const { Client, GatewayIntentBits, GuildMember, Events, PermissionsBitField } = require("discord.js");
const { joinVoiceChannel, getVoiceConnection } = require("@discordjs/voice");
const { addSpeechEvent, SpeechEvents, removeSpeechEvent} = require("discord-speech-recognition");
const { token, guildId, WitAiAPI, AzureAPI, AzureRegion} = require("./config.json");
const { QuickDB } = require("quick.db");
const { switchAPI, getCurrentSampleRate } = require('./speechAPI');
const db = new QuickDB();
const fs = require('fs').promises;
const commands = require('./commands');
const { OModule, checkStringOModule} = require('./moderationWords');
var spawn = require("child_process").spawn;
const cron = require('node-cron');
const path = require('path');
const checkProfanityAI = require("./openai.js");
const roleManager = require('./roleManager');

let client = new Client({
    intents: [
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
    ],
});

let speechFilterMode = 'default';   // default profanity filter  OPTIONS: default/ai
let speechAPI = 'google';           // default speech API OPTIONS: azure/google/witai

let channel;

console.log(Date.now());
let words = new OModule;
console.log(words.all());

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === "join") {
        commands.executeJoinCommand(interaction, GuildMember);
        channel = interaction.member.voice.channel;
        if (channel) {
            connection = getVoiceConnection(channel.guild.id);
            console.log(client.eventNames());

            if (speechAPI == 'azure') {
                addSpeechEvent(client, { key: AzureAPI, region: AzureRegion }, 2);
                console.log(client.eventNames());
            } else if (speechAPI == 'witai') {
                addSpeechEvent(client, { key: WitAiAPI }, 3);
                console.log(client.eventNames());
            } else if (speechAPI == 'google') {
                addSpeechEvent(client, {}, 1);
                console.log(client.eventNames());
            }
        } else {
            console.log("User is not in a voice channel.");
        }
    }

    if (commandName === "leave") {
        commands.executeLeaveCommand(interaction);
    }

    if (commandName === "reset") {
        commands.executeResetCommand(interaction, client, db);
    }

    if (commandName === "inspect") {
        let userMention = interaction.options.get('user').value;
        commands.executeInspectCommand(interaction, userMention, db, client)
    }

    if (commandName === "check") {
        commands.executeCheckCommand(interaction);
    }

    if (commandName === 'warn') {
        commands.executeWarnCommand(interaction, client, db);
    }
    if (commandName === 'decrease') {
        commands.executeDecreaseCommand(interaction, client, db);
    }

    if (commandName === 'modlist') {
        commands.executeModListCommand(interaction);
    }
    if (commandName === "speech-filter") {
        commands.executeSpeechFilterCommand(interaction).then(speechMode => {
            speechFilterMode = speechMode;
            console.log(speechFilterMode);
        });
    }
    if (commandName === "setapi") {
        commands.executeSetAPICommand(interaction).then(API => {
            speechAPI = API;
            switchAPI(speechAPI);

            client.removeAllListeners('voiceStateUpdate');
            client.removeAllListeners('voiceJoin');
            client.destroy();

            client = new Client({
                intents: [
                    GatewayIntentBits.GuildVoiceStates,
                    GatewayIntentBits.GuildMessages,
                    GatewayIntentBits.Guilds,
                    GatewayIntentBits.MessageContent,
                ],
            });

            console.log(`Logging in with token: ${token}`);
            client.login(token).then(() => {
                console.log('Logged in successfully');
                console.log(client.eventNames());
                console.log(getCurrentSampleRate());
            }).catch(err => {
                console.error('Error logging in:', err);
            });
        });
    }

    if (commandName === 'report') {
        const guild = await client.guilds.fetch(guildId);
        commands.executeReportCommand(interaction, guild);
    }
});

client.on(SpeechEvents.speech, (msg) => {
    if (!msg.content) return;

    let checkForProfanityResult;
    let user = msg.author.id;
    let isProfane = false; 
    let userPenaltyPoints = db.get(`user_penalty_points_${user}`);

    if (userPenaltyPoints === undefined) {
        userPenaltyPoints = db.set(`user_penalty_points_${user}`, 0)
    }

    // create message ID that allows to identify speech later
    const ID = getMessageID(user);

    msg.content.toLowerCase();

    console.log(msg.author.tag + " said: " + msg.content);

    if (speechFilterMode === 'default') {
        lemmatizeText(msg.content, (output) => {
            checkForProfanityResult = checkStringOModule(output);
            if (checkForProfanityResult > 0) {
                enforcePenalty(msg, checkForProfanityResult, ID, db);
                isProfane = true;
                saveAudio(msg, ID);
            } else {
                isProfane = false;
            }
            logSpeech(msg, ID, isProfane); 
        });
    } else if (speechFilterMode === 'ai') {
        checkForProfanityResult = checkProfanityAI(msg.content);
        if (checkForProfanityResult > 0) {
            enforcePenalty(msg, checkForProfanityResult, ID, db);
            isProfane = true;
            saveAudio(msg, ID);
        } else {
            isProfane = false;
        }
        logSpeech(msg, ID, isProfane); 
    }

});

client.on("ready", async () => {
    console.log("Bot is ready!");

    db.all('mute_').then(db => {
        console.log(db);
    });

roleManager.createVoiceModRole(client, guildId);

});

/**
 * Logs the user's speech as text in the 'logs.txt' file.
 * It creates a log entry with the user's ID, Discord tag, message content, and a flag indicating if the message is profane.
 * The log entry is appended to the 'logs.txt' file, with errors logged to the console if they occur.
 * 
 * @param {object} msg - The message object containing the user's speech data.
 * @param {string} ID - A unique identifier associated with the speech event.
 * @param {boolean} isProfane - A flag indicating whether the speech contains profanity.
 */
function logSpeech(msg, ID, isProfane) { 
    console.log(`Token in iProfaner: ${token}`);
    const logEntry = `${ID}: - [${msg.author.tag}] - [${msg.content}] - [${isProfane}] \n`;
    fs.appendFile('logs.txt', logEntry, (err) => {
        if (err) {
            console.error(`Error when saving to logs.txt file: ${err}`);
        } else {
            console.log(`Saved to logs.txt: ${logEntry}`);
        }
    });
}

/**
 * Saves the user's speech as an audio file.
 * The function creates a .wav file with a unique identifier based on the provided ID.
 * It attempts to save the incoming message content as an audio file in the 'records' directory.
 * 
 * @param {object} msg - The message object containing the user's speech data.
 * @param {string} ID - A unique identifier used to name the audio file.
 */
function saveAudio(msg, ID) {
    try {
        const fileName = `records/${ID}.wav`;
        msg.saveToFile(fileName);
    } catch (error) {
        console.error(`Error while saving audio file: ${error}`);
    }
}
/**
 * Applies penalty points to a user for rule violations and enforces corresponding actions.
 * The function increments the user's penalty points in the database and sends a direct message
 * to the user with details about the violation and current penalty points balance.
 * It calculates a penalty rank based on the total points and determines the mute duration accordingly.
 * Then, it calls the `muteUser` function to mute the user for the calculated duration.
 * 
 * @param {object} msg -  The message object containing the user's speech data.
 * @param {number} value - The number of penalty points to be added for the violation.
 * @param {string} ID - A unique identifier for the report, used in case of disputes.
 * @param {object} db - The database object for storing and retrieving penalty records.
 */
function enforcePenalty(msg, value, ID, db) {
    try {
        console.log(`Token in enofrcepenalty: ${token}`);
        db.add(`user_penalty_points_${msg.author.id}`, value);
        const userPenaltyPoints = db.get(`user_penalty_points_${msg.author.id}`);
        msg.author.send("Voice Guard has detected a violation of the rules. You recived " + value + " penalty points. Your current balance of penalty points is " + userPenaltyPoints + ". If you think this is a mistake report it using the /report command and providing this ID: " + ID);

        const penaltyRank = userPenaltyPoints <= 10 ? 1 : (userPenaltyPoints <= 50 ? 2 : (userPenaltyPoints <= 100 ? 3 : 4));

        let muteDuration = penaltyRank * value;

        muteUser(msg, muteDuration, db);

    } catch (err) {
        console.error(err);
    }
}
/**
 * Mutes a user in a Discord server for a specified duration.
 * The function finds the member object from the message context, mutes the member in voice chat,
 * and sets a timer to unmute after the duration has passed.
 * It also sends a direct message to the user, informing them of the mute duration,
 * and logs the mute in the database with an expiration timestamp.
 * 
 * @param {object} msg -  The message object containing the user's speech data.
 * @param {number} muteDuration - The duration in minutes for which the user is to be muted.
 * @param {object} db - The database object for storing mute records.
 */
function muteUser(msg, muteDuration, db) {
    try { 
        console.log(`Token in muteUser: ${token}`);
        const member = msg.channel.members.find(member => member.id === msg.author.id);
        member.voice.setMute(true);

        setTimeout(function () {
            member.voice.setMute(false);
        }, muteDuration * 60 * 1000);
        msg.author.send("You have been muted for " + muteDuration + "minutes.");
        db.set(`mute_${msg.author.id}`, Date.now() + muteDuration * 60 * 1000 );
        console.log(Date.now() + muteDuration * 60 * 1000)

        db.all().then(db => {
            console.log(db);
        });

    } catch (err) {
        console.log(err);
    }
}
/**
 * Periodically checks and unmutes users in a Discord server.
 * This function runs every minute to check the database for any mute records that have expired.
 * It addresses the issue of server resets interrupting the `setTimeout()` method in the `muteUser` function.
 * If a user's mute duration has passed, they are unmuted and their mute record is removed from the database.
 */
async function checkMutes() {
    console.log(`Token in checkmutes: ${token}`);
    cron.schedule('*/1 * * * *', async function checkMutes() {
        try {
            let mutes = [];
            await db.all().then(array => {
                array.forEach(element => {
                    if (element.id && element.id.startsWith("mute_")) {
                        mutes.push(element);
                    }
                })
            });

            console.log(mutes);

            for (let i = 0; i < mutes.length; i++) {
                const mute = mutes[i];
                const userId = mute.id.replace("mute_", "");

                const guild = client.guilds.cache.get(guildId);
                const member = guild.members.cache.get(userId);

                if (member && member.voice.channel && Date.now() > mute.value) {
                    member.voice.setMute(false);
                    db.delete(`mute_${userId}`);
                }
            }
        } catch (error) {
            console.error(`Error ocurred: ${error}`);
        }
    });
}
/**
 * Schedules a weekly task to reset user penalty points to zero.
 * This reset occurs at midnight (00:00) every Sunday.
 * It iterates through all users in the database and sets their penalty points to zero.
 * Upon successful completion, it logs a confirmation message.
 */
function startWeeklyReset() {
    cron.schedule('0 0 * * SUN', async function () {
        try {
            const users = await db.all();
            for (let user of users) {
                await db.set(`user_penalty_points_${user}`, 0);
            }
            console.log("Successfully reset penalty points for all users.");
        } catch (error) {
            console.error("An error occurred during the weekly reset:", error);
        }
    });
}

/**
 * Schedules a task to delete half of the recordings from the './records' directory every 15 minutes.
 * It calculates the number of files to delete as half of the total number of files present.
 * After deleting the calculated number of files, it logs the count of files removed.
 */
function deleteRecordings() {
    cron.schedule('0 */15 * * * *', async function () {
        const directory = './records';
        try {
            const files = await fs.readdir(directory);

            let deletedFilesCount = 0;
            const filesToDelete = Math.ceil(files.length / 2);

            for (const file of files) {
                await fs.unlink(path.join(directory, file));
                deletedFilesCount++;

                if (deletedFilesCount >= filesToDelete) {
                    break;
                }
            }

            console.log(`${deletedFilesCount} files removed.`);
        } catch (err) {
            console.error(err);
        }
    });
}
/**
 * The `lemmatizeText` function is used to lemmatize the given text.
 * It calls the Python script `lemma.py`, passing it the text to be processed.
 * When processing is complete, the result is returned by the `callback` function.
 * 
 * @param {string} input - Text to be lemmatized.
 * @param {function} callback - The callback function that will be called with the result.
 */
function lemmatizeText(input, callback) {
  console.log(`Token in lema: ${token}`);
  const process = spawn('python', ['-X', 'utf8', './lemma.py', input]);
  let lemmatizedOutput = '';

  process.stdout.on('data', (data) => {
    lemmatizedOutput += data.toString();
  });

  process.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  process.on('close', (code) => {
    callback(lemmatizedOutput);
  });
}

/**
 * Generates a unique message ID using the current date and time, combined with the user's identifier.
 * The message ID format is YYYYMMDDHHMMSS followed by the user's ID.
 * 
 * @param {string} user - The user identifier that will be appended to the message ID.
 * @returns {string} A unique message ID constructed from the date, time, and user ID.
 */
function getMessageID(user) {
    const now = new Date();
// Removes '-' and ':' characters from ISOString and trims milliseconds and timezone
    const ID = `${now.toISOString().replace(/[-T:]/g, '').slice(0, -5)}${user}`;
    return ID;
}

client.login(token);

startWeeklyReset();
checkMutes();
deleteRecordings();
