import * as migration_20260926_182105_initial from './20260926_182105_initial';
import * as migration_20260927_173643_site_settings_logo_height from './20260927_173643_site_settings_logo_height';
import * as migration_20260927_174805_site_settings_footer_logo_height from './20260927_174805_site_settings_footer_logo_height';
import * as migration_20260927_180544_hero_slides from './20260927_180544_hero_slides';
import * as migration_20260930_003958_album_and_photo_order from './20260930_003958_album_and_photo_order';

export const migrations = [
  {
    up: migration_20260926_182105_initial.up,
    down: migration_20260926_182105_initial.down,
    name: '20260926_182105_initial',
  },
  {
    up: migration_20260927_173643_site_settings_logo_height.up,
    down: migration_20260927_173643_site_settings_logo_height.down,
    name: '20260927_173643_site_settings_logo_height',
  },
  {
    up: migration_20260927_174805_site_settings_footer_logo_height.up,
    down: migration_20260927_174805_site_settings_footer_logo_height.down,
    name: '20260927_174805_site_settings_footer_logo_height',
  },
  {
    up: migration_20260927_180544_hero_slides.up,
    down: migration_20260927_180544_hero_slides.down,
    name: '20260927_180544_hero_slides',
  },
  {
    up: migration_20260930_003958_album_and_photo_order.up,
    down: migration_20260930_003958_album_and_photo_order.down,
    name: '20260930_003958_album_and_photo_order'
  },
];
