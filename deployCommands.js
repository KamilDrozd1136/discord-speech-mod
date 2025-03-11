const { SlashCommandBuilder, PermissionFlagsBits, PermissionsBitField } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { clientId, guildId, token } = require("./config.json");

const commands = [
    new SlashCommandBuilder()
        .setName("join")
        .setDescription("Bot joins voice channel and starts speech recognition"),
    new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Bot leaves voice channel"),
    new SlashCommandBuilder()
        .setName("inspect")
        .setDescription("Shows user info")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName("user")
                .setDescription("Mention user.")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Gives the user penalty points")
        .addStringOption((option) =>
            option
                .setName("user")
                .setDescription("Mention user.")
                .setRequired(true))
        .addStringOption((option) =>
            option
                .setName("value")
                .setDescription("Amount of warn points.")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("check")
        .setDescription("Send me audio file from report.")
        .addStringOption((option) =>
            option
                .setName("value")
                .setDescription("audio file ID")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("decrease")
        .setDescription("Decrease the number of user penalty points.")
        .addStringOption((option) =>
            option
                .setName("user")
                .setDescription("Mention user.")
                .setRequired(true))
        .addStringOption((option) =>
            option
                .setName("value")
                .setDescription("number of points")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("report")
        .setDescription("Appeal the penalty")
        .addStringOption((option) =>
            option
                .setName("value")
                .setDescription("report ID")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("reset")
        .setDescription("Reset user")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName("user")
                .setDescription("Mention user.")
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("add")
        .setDescription("Add voice moderator.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName('user_id')
                .setDescription('Provide user id.')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName("setapi")
        .setDescription("Set Speech-to-Text API")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('api')
                .setDescription('Choose your favourite.')
                .setRequired(true)
                .addChoices(
                    { name: 'GoogleSpeechToText', value: 'google' },
                    { name: 'AzureSpeechToText', value: 'azure' },
                    { name: 'WitAi', value: 'witai' },
                )),
    new SlashCommandBuilder()
        .setName("speech-filter")
        .setDescription("Set speech filter mode.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('modes')
                .setDescription('Speech moderation modes.')
                .setRequired(true)
                .addChoices(
                    { name: 'Default', value: 'default' },
                    { name: 'AI', value: 'ai' },
            )),
  new SlashCommandBuilder()
    .setName("remove")
      .setDescription("Remove voice moderator.")
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
        option 
            .setName('user_id')
            .setDescription('Provide user id.')
            .setRequired(true)),
    new SlashCommandBuilder()
        .setName("modlist")
        .setDescription("Show all voice moderators."),
].map((command) => command.toJSON());

const rest = new REST({ version: "9" }).setToken(token);

rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body: commands })
  .then(() => console.log("Successfully registered application commands."))
  .catch(console.error);
