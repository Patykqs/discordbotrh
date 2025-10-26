// index.js
import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
  REST,
  Routes,
} from 'discord.js';

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// --- Register Slash Command ---
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('diamonds')
      .setDescription('Track your diamond stats!')
      .toJSON(),
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(client.user.id, GUILD_ID),
      { body: commands }
    );
    console.log('✅ Slash command /diamonds registered!');
  } catch (err) {
    console.error('❌ Error registering command:', err);
  }
}

// --- Handle Interactions ---
client.on('interactionCreate', async (interaction) => {
  // When /diamonds is used
  if (interaction.isChatInputCommand() && interaction.commandName === 'diamonds') {
    const today = new Date().toLocaleDateString('de-DE');

    const message = `**Day** - ${today} - **[Start]** [Add] - **[End]** [Add]
**----------------------------------------------------**
**Total Amount** - [Add] Diamonds 💎
**----------------------------------------------------**
**Earned** - [Add] Diamonds 💎
**Spent** - [Add] Diamonds 💎
**----------------------------------------------------**`;

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('add_start').setLabel('Add Start Time').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('add_end').setLabel('Add End Time').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('add_total').setLabel('Add Total').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('add_earned').setLabel('Add Earned').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('add_spent').setLabel('Add Spent').setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ content: message, components: [buttons] });
  }

  // When a button is clicked
  if (interaction.isButton()) {
    const modal = new ModalBuilder()
      .setCustomId(`modal_${interaction.customId}`)
      .setTitle('Enter Value');

    const input = new TextInputBuilder()
      .setCustomId('input_value')
      .setLabel('Enter your value:')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
  }

  // When the modal is submitted
  if (interaction.type === InteractionType.ModalSubmit) {
    const value = interaction.fields.getTextInputValue('input_value');
    await interaction.reply({ content: `✅ You entered: **${value}**`, ephemeral: true });
  }
});

client.login(TOKEN).then(() => registerCommands());
