'use strict';

const path = require ('path');
const goblinName = path.basename (module.parent.filename, '.js');
const Papa = require ('papaparse');
const Goblin = require ('xcraft-core-goblin');

// Define initial logic values
const logicState = {
  preview: {header: {}, rows: {}},
  mapping: {
    header: {},
    rows: {},
  },
};

// Define logic handlers according rc.json
const logicHandlers = {
  create: (state, action) => {
    return state.set ('id', action.get ('id'));
  },
  'add-preview-column': (state, action) => {
    return state
      .set ('preview.header', action.get ('columns'))
      .set ('mapping.header', action.get ('columns'));
  },
  'add-preview-row': (state, action) => {
    return state.set (
      `preview.rows.${action.get ('rowId')}`,
      action.get ('row')
    );
  },
  'map-column-to-param': (state, action) => {
    return state.merge (`mapping.rows.mapping`, action.get ('row'));
  },
};

Goblin.registerQuest (goblinName, 'create', function (quest) {
  quest.do ();
});

Goblin.registerQuest (goblinName, 'preview-csv', function (quest, filePath) {
  try {
    const stream = require ('fs').createReadStream;
    let file = stream (filePath);
    Papa.parse (file, {
      header: true,
      preview: 1,
      step: row => {
        quest.me.addPreviewColumn ({header: row.data[0]});
      },
    });
    Papa.parse (file, {
      header: true,
      preview: 10,
      step: row => {
        quest.me.addPreviewRow ({data: row.data[0]});
      },
    });
  } catch (err) {
    throw new Error (err);
  }
});

Goblin.registerQuest (goblinName, 'add-preview-column', function (
  quest,
  header
) {
  const columns = {};
  for (const column in header) {
    columns[column] = {
      id: column,
      name: column,
      description: column,
      grow: '1',
      textAlign: 'right',
    };
  }

  quest.do ({columns});
});

Goblin.registerQuest (goblinName, 'map-column-to-param', function (
  quest,
  fromColumn,
  toParam
) {
  const row = {
    id: 'mapping',
    [fromColumn]: toParam,
  };

  quest.do ({row});
});

Goblin.registerQuest (goblinName, 'add-preview-row', function (quest, data) {
  const rowId = quest.uuidV4 ();
  const row = Object.assign (
    {
      id: rowId,
    },
    data
  );
  quest.do ({rowId, row});
});

Goblin.registerQuest (goblinName, 'load-csv', function (
  quest,
  filePath,
  mapping,
  rowGoblin
) {
  Papa.parse (filePath, {
    header: true,
    step: row => {
      const rowData = row.data[0];
      const params = {};
      for (const map in mapping) {
        const name = mapping[map];
        params[name] = rowData[map];
      }
      quest.createNew (rowGoblin, Object.assign ({}, params));
    },
  });
});

Goblin.registerQuest (goblinName, 'delete', function (quest) {});

// Create a Goblin with initial state and handlers
module.exports = Goblin.configure (goblinName, logicState, logicHandlers);
