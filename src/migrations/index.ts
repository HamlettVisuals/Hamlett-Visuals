import * as migration_20260926_182105_initial from './20260926_182105_initial';

export const migrations = [
  {
    up: migration_20260926_182105_initial.up,
    down: migration_20260926_182105_initial.down,
    name: '20260926_182105_initial'
  },
];
