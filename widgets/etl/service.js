'use strict';

const path = require ('path');
const goblinName = path.basename (module.parent.filename, '.js');
const Papa = require ('papaparse');
const Goblin = require ('xcraft-core-goblin');
const entityMeta = require ('goblin-rethink').entityMeta;

// Define initial logic values
const logicState = {
  preview: {header: {}, rows: {}},
  mapping: {
    header: {
      order: {
        id: 'order',
        name: 'order',
        description: 'N°',
        grow: '1',
        textAlign: 'right',
      },
      table: {
        id: 'table',
        name: 'table',
        description: 'table',
        grow: '1',
        textAlign: 'right',
      },
      type: {
        id: 'type',
        name: 'type',
        description: 'Type',
        grow: '1',
        textAlign: 'right',
      },
    },
    rows: {},
  },
};

// Define logic handlers according rc.json
const logicHandlers = {
  create: (state, action) => {
    return state.set ('id', action.get ('id'));
  },
  'add-preview-column': (state, action) => {
    return state.set ('preview.header', action.get ('columns'));
  },
  'add-preview-row': (state, action) => {
    return state.set (
      `preview.rows.${action.get ('rowId')}`,
      action.get ('row')
    );
  },
  'map-column-to-param': (state, action) => {
    const type = action.get ('type');
    const table = action.get ('table');
    const fromColumn = action.get ('fromColumn');
    const column = type + 'Id';
    return state
      .merge (`mapping.rows.${table}`, action.get ('row'))
      .set (`mapping.header.${fromColumn}`, {
        id: fromColumn,
        name: fromColumn,
        description: fromColumn,
        grow: '1',
        textAlign: 'right',
      })
      .set (`preview.header.${column}`, {
        id: column,
        name: column,
        description: column,
        grow: '1',
        textAlign: 'right',
      })
      .set (`mapping.header.${column}`, {
        id: column,
        name: column,
        description: column,
        grow: '1',
        textAlign: 'right',
      });
  },
};

Goblin.registerQuest (goblinName, 'create', function (quest, desktopId) {
  quest.goblin.setX ('desktopId', desktopId);
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
  table,
  fromColumn,
  toParam,
  type
) {
  const state = quest.goblin.getState ();
  const currentSize = state.get ('mapping.rows')._state.size;
  let order = state.get (`mapping.rows.${table}.order`);
  if (order === undefined) {
    order = currentSize;
  }
  const row = {
    id: table,
    order,
    table,
    type: type,
    references: {},
    [`${type}Id`]: '',
    [fromColumn]: toParam,
  };

  quest.do ({table, row});
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

Goblin.registerQuest (goblinName, 'load-csv', function* (
  quest,
  filePath,
  mapping,
  next
) {
  try {
    const stream = require ('fs').createReadStream;
    let file = stream (filePath);
    const ids = [];
    const tables = {};
    const orderMapping = [];

    for (const table in mapping) {
      orderMapping.splice (mapping[table].order, 0, mapping[table]);
      tables[table] = [];
    }
    orderMapping.sort ();
    let rowIndex = 0;
    Papa.parse (file, {
      header: true,
      complete: next.parallel ().arg (0),
      step: row => {
        const rowData = row.data[0];
        for (const tableMap of orderMapping) {
          const table = tableMap.table;
          const type = tableMap.type;
          const entity = {
            id: `${type}@${quest.uuidV4 ()}`,
          };

          entityMeta.set (
            entity,
            type,
            null,
            null,
            null,
            entity.id,
            [],
            'initial-import'
          );

          for (const map in tableMap) {
            if (
              map === 'table' ||
              map === 'type' ||
              map === 'references' ||
              map === 'order' ||
              map === 'id'
            ) {
              continue;
            }
            const name = tableMap[map];
            if (rowData[map]) {
              entity[name] = rowData[map];
              continue;
            }
            if (ids[rowIndex]) {
              if (ids[rowIndex][map]) {
                entity[name] = ids[rowIndex][map];
                continue;
              }
            }
          }

          ids[rowIndex] = {[`${type}Id`]: entity.id};
          tables[table].push (entity);
        }
        rowIndex++;
      },
    });

    yield next.sync ();
    const i = quest.openInventory ();
    const desktopId = quest.goblin.getX ('desktopId');
    const deskAPI = quest.getGoblinAPI ('desktop', desktopId);
    const r = i.getAPI (`rethink@${desktopId}`);
    for (const table in tables) {
      yield r.set ({table, documents: tables[table]});
      deskAPI.addNotification ({
        color: 'red',
        message: `${tables[table].length} entités ${table} inséréés dans le stockage, démarrage de la mise à jour des entités...`,
        glyph: 'check',
      });

      let batchCount = 0;
      const batchSize = 200;
      for (const entity of tables[table]) {
        quest.cmd (
          `${table}.create`,
          {
            id: entity.id,
            desktopId,
            entity: entity,
          },
          next.parallel ()
        );

        batchCount++;
        if (batchCount % batchSize === 0) {
          const ids = yield next.sync ();
          for (const did of ids) {
            quest.cmd (`${table}.delete`, {
              id: did,
            });
          }

          deskAPI.addNotification ({
            notificationId: 'etl',
            color: 'red',
            message: `${Number (batchCount / tables[table].length * 100).toFixed (0)}% mis à jour`,
            glyph: 'check',
          });
        }
      }
      const ids = yield next.sync ();
      deskAPI.addNotification ({
        color: 'red',
        message: `${ids.length} entités ${table} mises à jour`,
        glyph: 'check',
      });
      for (const did of ids) {
        quest.cmd (`${table}.delete`, {
          id: did,
        });
      }
      deskAPI.addNotification ({
        color: 'green',
        message: `${tables[table].length} entités ${table} chargées`,
        glyph: 'check',
      });
    }
    return;
  } catch (err) {
    throw new Error (err);
  }
});

Goblin.registerQuest (goblinName, 'delete', function (quest) {});

// Create a Goblin with initial state and handlers
module.exports = Goblin.configure (goblinName, logicState, logicHandlers);
