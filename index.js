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
const messageState = new Map(); // messageId => state

// -------------------- Helper functions --------------------
function buildMessageContent(command, state) {
  const date = state.date ?? new Date().toLocaleDateString('de-DE');

  if (command === 'diamonds') {
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

  if (command === 'trades') {
    const withUser = state.withUser ?? '[Add]';
    const gaveDiamonds = state.gave?.diamonds ?? 0;
    const gaveItems = state.gave?.items?.length ? state.gave.items.map(i => `- ${i}`).join('\n') : '';
    const gotDiamonds = state.got?.diamonds ?? 0;
    const gotItems = state.got?.items?.length ? state.got.items.map(i => `- ${i}`).join('\n') : '';
    const profitLoss = state.profitLoss ?? 0;
    return `**Date** - ${date}
**----------------------------------------------------**
**With** - ${withUser}
**----------------------------------------------------**
**Gave**
${gaveDiamonds ? `- ${gaveDiamonds} Diamonds 💎\n` : ''}${gaveItems}
**----------------------------------------------------**
**Got**
${gotDiamonds ? `- ${gotDiamonds} Diamonds 💎\n` : ''}${gotItems}
**----------------------------------------------------**
**Profit/Loss:** ${profitLoss}`;
  }

  if (command === 'levels') {
    const start = state.startTime ?? '[Add]';
    const end = state.endTime ?? '[Add]';
    const before = state.beforeLevel ?? '[Add]';
    const earned = state.earned ?? '[Add]';
    const current = state.currentPercent ?? '[Add]';
    const after = state.afterLevel ?? '[Add]';
    return `**Date** - ${date}
**----------------------------------------------------**
**Time** - **[Start]** ${start} - **[End]** ${end}
**----------------------------------------------------**
**Before Level** - ${before}
**Earned** - ${earned} Levels ⭐
**Current** - ${current} %
**After Level** - ${after}
**----------------------------------------------------**`;
  }
}

// -------------------- Buttons --------------------
function getActionRows(command) {
  if (command === 'diamonds') {
    return [
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
  }

  if (command === 'trades') {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('add_with').setLabel('Add With').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('add_gave_diamonds').setLabel('Gave Diamonds').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_gave_item').setLabel('Gave Item').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('add_got_diamonds').setLabel('Got Diamonds').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_got_item').setLabel('Got Item').setStyle(ButtonStyle.Success)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('delete_gave_item').setLabel('Delete Gave Item').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('delete_got_item').setLabel('Delete Got Item').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('set_profit_loss').setLabel('Set Profit/Loss').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('finish').setLabel('Finish ✅').setStyle(ButtonStyle.Secondary)
      ),
    ];
  }

  if (command === 'levels') {
    return [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('add_start').setLabel('Add Start').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('add_end').setLabel('Add End').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('add_before').setLabel('Before Level').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('add_earned').setLabel('Add Earned').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('add_current').setLabel('Add Current').setStyle(ButtonStyle.Secondary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('add_after').setLabel('After Level').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('finish').setLabel('Finish ✅').setStyle(ButtonStyle.Secondary)
      ),
    ];
  }
}

// -------------------- Slash Commands --------------------
client.once('clientReady', () => console.log(`✅ Logged in as ${client.user.tag}`));

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('diamonds').setDescription('Track diamonds').toJSON(),
    new SlashCommandBuilder().setName('trades').setDescription('Track trades').toJSON(),
    new SlashCommandBuilder().setName('levels').setDescription('Track levels').toJSON(),
  ];
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(client.user.id, GUILD_ID), { body: commands });
  console.log('✅ Slash commands registered!');
}

// -------------------- Interaction Handling --------------------
client.on('interactionCreate', async (interaction) => {
  try {
    // Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.commandName;
      const state = { date: new Date().toLocaleDateString('de-DE'), command };
      const content = buildMessageContent(command, state);
      const rows = getActionRows(command);
      await interaction.reply({ content, components: rows });
      const msg = await interaction.fetchReply();
      messageState.set(msg.id, state);
      return;
    }

    // Button clicks
    if (interaction.isButton()) {
      const msg = interaction.message;
      const state = messageState.get(msg.id);
      if (!state) return;

      // Finish button
      if (interaction.customId === 'finish') {
        const disabled = msg.components.map(r => {
          const newRow = ActionRowBuilder.from(r);
          newRow.components = r.components.map(b => ButtonBuilder.from(b).setDisabled(true));
          return newRow;
        });
        await interaction.update({ components: disabled });
        return;
      }

      // /trades delete buttons
      if (state.command === 'trades') {
        if (interaction.customId === 'delete_gave_item' && state.gave?.items?.length) {
          state.gave.items.pop();
          await msg.edit({ content: buildMessageContent('trades', state) });
          await interaction.reply({ content: '✅ Last Gave Item deleted', ephemeral: true });
          return;
        }
        if (interaction.customId === 'delete_got_item' && state.got?.items?.length) {
          state.got.items.pop();
          await msg.edit({ content: buildMessageContent('trades', state) });
          await interaction.reply({ content: '✅ Last Got Item deleted', ephemeral: true });
          return;
        }
        if (interaction.customId === 'set_profit_loss') {
          const modal = new ModalBuilder()
            .setCustomId(`modal|set_profit_loss|${msg.id}`)
            .setTitle('Profit/Loss (e.g., +1251 or -1561)');
          const input = new TextInputBuilder()
            .setCustomId('value_input')
            .setLabel('Profit/Loss (+/-)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
          return;
        }
      }

      // Other buttons → open modal for input
      const modal = new ModalBuilder()
        .setCustomId(`modal|${interaction.customId}|${msg.id}`)
        .setTitle('Enter value');
      const input = new TextInputBuilder()
        .setCustomId('value_input')
        .setLabel('Enter value')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      await interaction.showModal(modal);
    }

    // Modal submissions
    if (interaction.type === InteractionType.ModalSubmit) {
      const [prefix, action, messageId] = interaction.customId.split('|');
      if (prefix !== 'modal') return;
      const value = interaction.fields.getTextInputValue('value_input').trim();

      const state = messageState.get(messageId);
      if (!state) return;

      switch (state.command) {
        case 'diamonds':
          if (action === 'add_start') state.start = value;
          if (action === 'add_end') state.end = value;
          if (action === 'add_total') state.total = value;
          if (action === 'add_earned') state.earned = value;
          if (action === 'add_spent') state.spent = value;
          break;

        case 'trades':
          state.gave ??= { diamonds: 0, items: [] };
          state.got ??= { diamonds: 0, items: [] };
          if (action === 'add_with') state.withUser = value;
          if (action === 'add_gave_diamonds') state.gave.diamonds = Number(value);
          if (action === 'add_gave_item') state.gave.items.push(value);
          if (action === 'add_got_diamonds') state.got.diamonds = Number(value);
          if (action === 'add_got_item') state.got.items.push(value);
          if (action === 'set_profit_loss') state.profitLoss = value;
          break;

        case 'levels':
          if (action === 'add_start') state.startTime = value;
          if (action === 'add_end') state.endTime = value;
          if (action === 'add_before') state.beforeLevel = value;
          if (action === 'add_earned') state.earned = value;
          if (action === 'add_current') state.currentPercent = value;
          if (action === 'add_after') state.afterLevel = value;
          break;
      }

      messageState.set(messageId, state);
      const channel = await client.channels.fetch(interaction.channelId);
      const msg = await channel.messages.fetch(messageId);
      await msg.edit({ content: buildMessageContent(state.command, state) });
      await interaction.reply({ content: `✅ Saved: ${value}`, ephemeral: true });
    }
  } catch (err) {
    console.error(err);
    if (!interaction.replied) await interaction.reply({ content: '❌ Error occurred', ephemeral: true });
  }
});

client.login(TOKEN).then(() => registerCommands());

