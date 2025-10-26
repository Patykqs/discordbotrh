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

const messageState = new Map();

function buildTemplate(state) {
  const date = state.date ?? new Date().toLocaleDateString('de-DE');
  const start = state.start ?? '[Add]';
  const end = state.end ?? '[Add]';
  const total = state.total ?? '[Add]';
  const earned = state.earned ?? '[Add]';
  const spent = state.spent ?? '[Add]';

  return `**Day** - ${date} - **[Start]** ${start} - **[End]** ${end}
**----------------------------------------------------**
**Total Amount** - ${total} Diamonds 💎
**----------------------------------------------------**
**Earned** - ${earned} Diamonds 💎
**Spent** - ${spent} Diamonds 💎
**----------------------------------------------------**`;
}

client.once('clientReady', () => console.log(`✅ Logged in as ${client.user.tag}`));

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('diamonds')
      .setDescription('Track your diamond stats!')
      .toJSON(),
  ];
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
  console.log('✅ Slash command /diamonds registered!');
}

client.on('interactionCreate', async (interaction) => {
  try {
    // --------------- /diamonds ---------------
    if (interaction.isChatInputCommand() && interaction.commandName === 'diamonds') {
      const state = { date: new Date().toLocaleDateString('de-DE') };
      const content = buildTemplate(state);

const rows = [
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('add_start').setLabel('Add Start').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('add_end').setLabel('Add End').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('add_total').setLabel('Add Total').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('add_earned').setLabel('Add Earned').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('add_spent').setLabel('Add Spent').setStyle(ButtonStyle.Danger)
  ),
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('finish').setLabel('Finish ✅').setStyle(ButtonStyle.Secondary)
  ),
];
await interaction.reply({ content, components: rows });

      const msg = await interaction.fetchReply();
      messageState.set(msg.id, state);
      return;
    }

    // --------------- Button clicks ---------------
    if (interaction.isButton()) {
      // Finish Button
      if (interaction.customId === 'finish') {
        // Disable all buttons (lock the message)
        const msg = interaction.message;
        const disabled = msg.components.map(row => {
          const newRow = ActionRowBuilder.from(row);
          newRow.components = row.components.map(b => ButtonBuilder.from(b).setDisabled(true));
          return newRow;
        });
        await interaction.update({ components: disabled });
        return;
      }

      // For normal add buttons
      const modal = new ModalBuilder()
        .setCustomId(`modal|${interaction.customId}|${interaction.message.id}`)
        .setTitle('Enter value');

      const input = new TextInputBuilder()
        .setCustomId('value_input')
        .setLabel('Enter value (time or amount)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
      return;
    }

    // --------------- Modal submissions ---------------
    if (interaction.type === InteractionType.ModalSubmit) {
      const [prefix, which, messageId] = interaction.customId.split('|');
      if (prefix !== 'modal') return;
      const value = interaction.fields.getTextInputValue('value_input').trim();

      const state = messageState.get(messageId) ?? { date: new Date().toLocaleDateString('de-DE') };
      if (which === 'add_start') state.start = value;
      if (which === 'add_end') state.end = value;
      if (which === 'add_total') state.total = value;
      if (which === 'add_earned') state.earned = value;
      if (which === 'add_spent') state.spent = value;
      messageState.set(messageId, state);

      const channel = await client.channels.fetch(interaction.channelId);
      const msg = await channel.messages.fetch(messageId);
      await msg.edit({ content: buildTemplate(state) });

      await interaction.reply({ content: `✅ Saved: **${value}**`, ephemeral: true });
    }
  } catch (err) {
    console.error('Error handling interaction:', err);
    if (!interaction.replied) await interaction.reply({ content: '❌ Error occurred', ephemeral: true });
  }
});

client.login(TOKEN).then(() => registerCommands());
