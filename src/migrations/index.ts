import * as migration_20260926_182105_initial from './20260926_182105_initial';
import * as migration_20260927_173643_site_settings_logo_height from './20260927_173643_site_settings_logo_height';
import * as migration_20260927_174805_site_settings_footer_logo_height from './20260927_174805_site_settings_footer_logo_height';
import * as migration_20260927_180544_hero_slides from './20260927_180544_hero_slides';
import * as migration_20260930_003958_album_and_photo_order from './20260930_003958_album_and_photo_order';
import * as migration_20261001_233049_featured_offer_show_on_homepage from './20261001_233049_featured_offer_show_on_homepage';
import * as migration_20261002_164620_hero_seconds_per_photo from './20261002_164620_hero_seconds_per_photo';
import * as migration_20261002_185706_testimonials_admin from './20261002_185706_testimonials_admin';
import * as migration_20261005_233216_booking_page_copy from './20261005_233216_booking_page_copy';
import * as migration_20261005_234930_inquiry_time_and_instagram from './20261005_234930_inquiry_time_and_instagram';
import * as migration_20261006_223744_instagram_section from './20261006_223744_instagram_section';

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
    name: '20260930_003958_album_and_photo_order',
  },
  {
    up: migration_20261001_233049_featured_offer_show_on_homepage.up,
    down: migration_20261001_233049_featured_offer_show_on_homepage.down,
    name: '20261001_233049_featured_offer_show_on_homepage',
  },
  {
    up: migration_20261002_164620_hero_seconds_per_photo.up,
    down: migration_20261002_164620_hero_seconds_per_photo.down,
    name: '20261002_164620_hero_seconds_per_photo',
  },
  {
    up: migration_20261002_185706_testimonials_admin.up,
    down: migration_20261002_185706_testimonials_admin.down,
    name: '20261002_185706_testimonials_admin',
  },
  {
    up: migration_20261005_233216_booking_page_copy.up,
    down: migration_20261005_233216_booking_page_copy.down,
    name: '20261005_233216_booking_page_copy',
  },
  {
    up: migration_20261005_234930_inquiry_time_and_instagram.up,
    down: migration_20261005_234930_inquiry_time_and_instagram.down,
    name: '20261005_234930_inquiry_time_and_instagram',
  },
  {
    up: migration_20261006_223744_instagram_section.up,
    down: migration_20261006_223744_instagram_section.down,
    name: '20261006_223744_instagram_section'
  },
];
