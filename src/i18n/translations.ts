/**
 * translations.ts
 *
 * App-wide translation strings.
 * Add new keys to TranslationKeys and both locales simultaneously.
 * Macedonian strings marked TODO can be filled in later.
 */

export const LANGUAGES = {
  en: "English",
  mk: "Македонски",
} as const;

export const LANGUAGE_FLAGS: Record<keyof typeof LANGUAGES, string> = {
  en: "🇬🇧",
  mk: "🇲🇰",
};

export type LanguageCode = keyof typeof LANGUAGES;

export type TranslationKeys = {
  // ── Tabs ────────────────────────────────────────────────────────────────
  tab_home: string;
  tab_bank_cards: string;
  tab_personal_docs: string;
  tab_search: string;
  tab_profile: string;
  tab_settings: string;

  // ── Common ──────────────────────────────────────────────────────────────
  common_save: string;
  common_cancel: string;
  common_delete: string;
  common_edit: string;
  common_done: string;
  common_close: string;
  common_back: string;
  common_yes: string;
  common_no: string;
  common_confirm: string;
  common_loading: string;
  common_error: string;
  common_retry: string;
  common_or: string;

  // ── Add Card Sheet ───────────────────────────────────────────────────────
  add_card_title: string;
  add_card_scan_button: string;
  add_card_scan_beta: string;
  add_card_import_button: string;

  // ── Card Form ───────────────────────────────────────────────────────────
  form_title: string;
  form_subtitle: string;
  form_holder_name: string;
  form_card_number: string;
  form_expiry: string;
  form_category: string;
  form_type: string;
  form_notes: string;
  form_color: string;
  form_name_placeholder: string;
  form_number_placeholder: string;
  form_expiry_placeholder: string;
  form_notes_placeholder: string;
  form_choose_category: string;
  form_choose_type: string;
  form_select_color: string;
  form_save_changes: string;
  form_create_card: string;
  form_validation_name_required: string;
  form_validation_number_required: string;
  form_validation_expiry_invalid: string;
  form_category_helper: string;
  form_front_details: string;
  form_back_details: string;
  form_choose_one: string;
  form_flip_preview_hint: string;
  form_pick_color: string;
  form_apply: string;
  form_next: string;

  // ── Cards ───────────────────────────────────────────────────────────────
  cards_saved_items: string;
  cards_no_cards_title: string;
  cards_no_cards_body: string;
  cards_add_first_card: string;
  cards_expires_label: string;
  cards_issuer_label: string;
  cards_delete_confirm_title: string;
  cards_delete_confirm_body: string;
  cards_edit_card: string;
  cards_share_card: string;
  cards_copy_number: string;
  cards_copied: string;
  cards_manage_heading: string;
  cards_add_first_subtitle: string;
  cards_demo_title: string;
  cards_demo_body: string;
  cards_none_in_category: string;
  card_detail_not_found: string;
  card_detail_front: string;
  card_detail_back: string;
  card_detail_flip_hint: string;
  card_detail_delete_card: string;
  card_detail_auto_delete_banner: string;
  card_detail_auto_delete_today: string;
  card_detail_share_preparing: string;
  card_detail_share_title: string;
  card_detail_share_body: string;
  card_detail_share_image: string;
  card_detail_share_image_body: string;
  card_detail_share_text: string;
  card_detail_share_text_body: string;
  card_detail_share_file: string;
  card_detail_share_file_body: string;
  card_detail_copy_toast_suffix: string;

  // ── Settings ────────────────────────────────────────────────────────────
  settings_title: string;
  settings_subtitle: string;

  settings_section_appearance: string;
  settings_appearance_body: string;
  settings_theme_system: string;
  settings_theme_light: string;
  settings_theme_dark: string;

  settings_section_language: string;
  settings_language_body: string;

  settings_section_security: string;
  settings_biometric_lock_label: string;
  settings_biometric_lock_desc: string;
  settings_block_screenshots_label: string;
  settings_block_screenshots_desc: string;
  settings_lock_screen_label: string;
  settings_lock_screen_desc: string;

  settings_section_reminders: string;
  settings_expiry_notifications_label: string;
  settings_expiry_notifications_desc: string;

  settings_section_cloud_sync: string;
  settings_cloud_sync_body: string;

  settings_section_support: string;
  settings_support_body: string;
  settings_support_status: string;
  settings_support_active: string;
  settings_support_not_yet: string;
  settings_support_type: string;
  settings_support_last_payment: string;
  settings_support_next_renewal: string;
  settings_support_tips_count: string;
  settings_view_support_options: string;
  settings_restore_purchases: string;

  settings_section_developer: string;
  settings_send_test_notification: string;
  settings_view_onboarding: string;

  // ── Profile ─────────────────────────────────────────────────────────────
  profile_title: string;
  profile_signed_in_as: string;
  profile_sign_in: string;
  profile_sign_out: string;
  profile_personal_stats: string;
  profile_saved_items: string;
  profile_active_categories: string;
  profile_categories_short: string;
  profile_support_cta_active: string;
  profile_support_cta_inactive: string;
  profile_support_button_active: string;
  profile_support_button_inactive: string;
  profile_account_section: string;
  profile_checking_session: string;
  profile_continue_google: string;
  profile_connecting_google: string;
  profile_switch_google_account: string;
  profile_switching_google: string;
  profile_signing_out: string;
  profile_sync_disabled_tap_setup: string;
  profile_setup_sync_title: string;
  profile_setup_sync_body: string;
  profile_set_sync_passphrase: string;
  profile_read_more: string;
  profile_signin_restore_body: string;

  // ── Search ──────────────────────────────────────────────────────────────
  search_placeholder: string;
  search_no_results: string;

  // ── Onboarding ──────────────────────────────────────────────────────────
  onboarding_welcome: string;
  onboarding_get_started: string;

  // ── Alerts / Dialogs ──────────────────────────────────────────────────
  alert_cancel: string;
  alert_disable: string;
  alert_disable_lock_screen_title: string;
  alert_disable_lock_screen_body: string;
  alert_purchases_restored_title: string;
  alert_purchases_restored_body: string;
  alert_restore_failed_title: string;
  alert_restore_failed_fallback: string;
  alert_subscription_settings_failed_title: string;
  alert_subscription_settings_failed_fallback: string;
  alert_forget_passphrase_title: string;
  alert_forget_passphrase_body: string;
  alert_forget_passphrase_btn: string;
  alert_forget_passphrase_failed_title: string;
  alert_forget_passphrase_failed_body: string;
  alert_sync_passphrase_required_title: string;
  alert_sync_passphrase_required_body: string;
  alert_syncing_body: string;
  alert_delete_local_data_title: string;
  alert_delete_local_data_body_signed_in: string;
  alert_delete_local_data_body_signed_out: string;
  alert_delete_data_btn: string;
  alert_data_deleted_title: string;
  alert_data_deleted_body_signed_in: string;
  alert_data_deleted_body_signed_out: string;
  alert_delete_data_failed_title: string;
  alert_delete_data_failed_body: string;
  alert_delete_account_title: string;
  alert_delete_account_body: string;
  alert_delete_account_btn: string;
  alert_delete_account_failed_title: string;
  alert_delete_account_failed_fallback: string;
  alert_invalid_shared_card_title: string;
  alert_invalid_shared_card_body: string;
  alert_open_shared_card_failed_title: string;
  alert_open_shared_card_failed_body: string;
  alert_google_signin_failed: string;
  alert_switch_google_failed: string;
  alert_signout_failed: string;

  // ── Cloud Sync Settings ───────────────────────────────────────────────
  cloud_sign_in_prompt: string;
  cloud_to_profile: string;
  cloud_setup_title: string;
  cloud_setup_body: string;
  cloud_step_sign_in: string;
  cloud_step_sign_in_done: string;
  cloud_step_create_passphrase: string;
  cloud_step_passphrase_desc: string;
  cloud_set_sync_passphrase: string;
  cloud_update_sync_passphrase: string;
  cloud_step_read_how: string;
  cloud_step_read_how_desc: string;
  cloud_read_more: string;
  cloud_vault_enabled: string;
  cloud_vault_checking: string;
  cloud_vault_not_setup: string;
  cloud_vault_enabled_desc: string;
  cloud_vault_not_setup_desc: string;
  cloud_forgetting_passphrase: string;
  cloud_forget_passphrase_btn: string;
  cloud_syncing_data: string;
  cloud_sync_data_btn: string;
  cloud_account_deletion: string;
  cloud_account_deletion_desc: string;
  cloud_deleting_account: string;
  cloud_delete_account_btn: string;

  // ── Data Management ───────────────────────────────────────────────────
  data_management_title: string;
  data_management_body: string;
  data_deleting_local: string;
  data_delete_local_btn: string;

  // ── Support Types ─────────────────────────────────────────────────────
  support_type_monthly: string;
  support_type_lifetime: string;
  support_type_tip: string;
  support_cancel_monthly: string;

  // ── Credits ───────────────────────────────────────────────────────────
  credits_title: string;
  credits_body: string;
  credits_developed_by: string;
  credits_view_all: string;
  credits_all_rights: string;
  credits_thanks: string;

  // ── Biometric Warnings ────────────────────────────────────────────────
  biometric_no_hardware: string;
  biometric_not_enrolled: string;

  // ── Search Extended ───────────────────────────────────────────────────
  search_empty_hint: string;

  // ── Passphrase Reminder Modal ─────────────────────────────────────────
  passphrase_reminder_title: string;
  passphrase_reminder_body: string;
  passphrase_reminder_go_profile: string;
  passphrase_reminder_later: string;

  // ── Support Modal ─────────────────────────────────────────────────────
  support_modal_title: string;
  support_modal_loading: string;
  support_modal_error_title: string;
  support_modal_thank_you: string;
  support_modal_thank_you_body: string;
  support_modal_continue: string;
  support_modal_monthly_section: string;
  support_modal_best_ongoing: string;
  support_modal_recurring: string;
  support_modal_highlight_sustainable: string;
  support_modal_highlight_manage: string;
  support_modal_billed_by: string;
  support_modal_active: string;
  support_modal_starting: string;
  support_modal_start_monthly: string;
  support_modal_manage_subscription: string;
  support_modal_onetime_section: string;
  support_modal_owned: string;
  support_modal_added: string;
  support_modal_buying: string;
  support_modal_unlock_forever: string;
  support_modal_buy: string;
  support_modal_badge_lifetime: string;
  support_modal_badge_onetime: string;
  support_modal_purchase_error: string;

  // ── CardForm Extras ───────────────────────────────────────────────────
  form_card_color: string;
  form_cancel_btn: string;
  form_confirm_btn: string;

  // ── Profile Extended ──────────────────────────────────────────────────
  profile_not_supporter: string;
  profile_category_breakdown: string;
  profile_support_body_lifetime: string;
  profile_support_body_monthly: string;
  profile_support_body_tipper: string;
  profile_support_body_default: string;
  profile_pocket_id_user: string;
};

export const translations: Record<LanguageCode, TranslationKeys> = {
  en: {
    // Tabs
    tab_home: "Home",
    tab_bank_cards: "Bank Cards",
    tab_personal_docs: "Documents",
    tab_search: "Search",
    tab_profile: "Profile",
    tab_settings: "Settings",

    // Common
    common_save: "Save",
    common_cancel: "Cancel",
    common_delete: "Delete",
    common_edit: "Edit",
    common_done: "Done",
    common_close: "Close",
    common_back: "Back",
    common_yes: "Yes",
    common_no: "No",
    common_confirm: "Confirm",
    common_loading: "Loading…",
    common_error: "Error",
    common_retry: "Retry",
    common_or: "or",

    // Add Card
    add_card_title: "Add new",
    add_card_scan_button: "Scan",
    add_card_scan_beta: "Beta",
    add_card_import_button: "Import",

    // Card Form
    form_title: "Title",
    form_subtitle: "Subtitle",
    form_holder_name: "Holder Name",
    form_card_number: "Card Number",
    form_expiry: "Expiry",
    form_category: "Category",
    form_type: "Type",
    form_notes: "Notes",
    form_color: "Color",
    form_name_placeholder: "e.g. John Smith",
    form_number_placeholder: "e.g. 1234 5678 9012 3456",
    form_expiry_placeholder: "MM/YY",
    form_notes_placeholder: "Add any note about this card",
    form_choose_category: "Choose a category",
    form_choose_type: "Choose a type",
    form_select_color: "Select color",
    form_save_changes: "Save changes",
    form_create_card: "Create",
    form_validation_name_required: "Name is required.",
    form_validation_number_required: "Card number is required.",
    form_validation_expiry_invalid: "Expiry format must be MM/YY.",
    form_category_helper:
      "Choose the broad card family first — this changes the available fields below.",
    form_front_details: "Front details",
    form_back_details: "Back details",
    form_choose_one: "Choose one",
    form_flip_preview_hint: "Tap the card preview to flip",
    form_pick_color: "Pick a color",
    form_apply: "Apply",
    form_next: "Next",

    // Cards
    cards_saved_items: "Saved items",
    cards_no_cards_title: "No cards yet",
    cards_no_cards_body: "Start by adding your first card to this category.",
    cards_add_first_card: "Add first card",
    cards_expires_label: "Expires",
    cards_issuer_label: "Issuer",
    cards_delete_confirm_title: "Delete this card?",
    cards_delete_confirm_body: "This action cannot be undone.",
    cards_edit_card: "Edit card",
    cards_share_card: "Share card",
    cards_copy_number: "Copy number",
    cards_copied: "Copied",
    cards_manage_heading: "Manage",
    cards_add_first_subtitle: "Tap here to get started",
    cards_demo_title: "Demo cards",
    cards_demo_body:
      "Don't worry, these disappear once you add a card or sync your cards.",
    cards_none_in_category: "No cards in this category yet.",
    card_detail_not_found: "Card not found",
    card_detail_front: "Front",
    card_detail_back: "Back",
    card_detail_flip_hint: "Tap card to flip",
    card_detail_delete_card: "Delete Card",
    card_detail_auto_delete_banner:
      "This expired card will be automatically deleted in {days} day(s).",
    card_detail_auto_delete_today:
      "This expired card will be automatically deleted today.",
    card_detail_share_preparing: "Preparing share…",
    card_detail_share_title: "Share Card",
    card_detail_share_body: "Choose how you want to send this card.",
    card_detail_share_image: "Image",
    card_detail_share_image_body: "Share the styled card preview as an image.",
    card_detail_share_text: "Text",
    card_detail_share_text_body: "Share the card fields as plain text.",
    card_detail_share_file: "Pocket ID File",
    card_detail_share_file_body:
      "Send one card through Gmail, Google Drive, or Files and import it on another device.",
    card_detail_copy_toast_suffix: "copied!",

    // Settings
    settings_title: "Settings",
    settings_subtitle:
      "Control the wallet look, lock behavior, and reminder automation.",

    settings_section_appearance: "Appearance",
    settings_appearance_body:
      "Choose whether the app follows the system theme or stays in light or dark mode.",
    settings_theme_system: "System",
    settings_theme_light: "Light",
    settings_theme_dark: "Dark",

    settings_section_language: "Language",
    settings_language_body: "Choose the language used throughout the app.",

    settings_section_security: "Security",
    settings_biometric_lock_label: "Biometric Lock",
    settings_biometric_lock_desc:
      "Require biometrics or the device passcode fallback when Pocket ID is locked.",
    settings_block_screenshots_label: "Block Screenshots",
    settings_block_screenshots_desc:
      "Prevent screenshots and screen recordings while Pocket ID is open.",
    settings_lock_screen_label: "Lock Screen",
    settings_lock_screen_desc:
      "Hide app content on the recent apps screen and when the app is backgrounded.",

    settings_section_reminders: "Reminders",
    settings_expiry_notifications_label: "Expiry Notifications",
    settings_expiry_notifications_desc:
      "Schedule reminders 1 month, 2 weeks and 2 days before supported cards expire.",

    settings_section_cloud_sync: "Cloud Sync",
    settings_cloud_sync_body:
      "Manage your encrypted cloud vault, sync cloud data on demand, and clean up this device when needed.",

    settings_section_support: "Your Support",
    settings_support_body:
      "RevenueCat supporter details for this app-store account.",
    settings_support_status: "Status",
    settings_support_active: "Active ❤️",
    settings_support_not_yet: "Not a supporter yet",
    settings_support_type: "Support type",
    settings_support_last_payment: "Last payment date",
    settings_support_next_renewal: "Next renewal date",
    settings_support_tips_count: "Total tips count",
    settings_view_support_options: "View Support Options",
    settings_restore_purchases: "Restore Purchases",

    settings_section_developer: "Developer Actions",
    settings_send_test_notification: "Send test notification (5 s)",
    settings_view_onboarding: "View onboarding again",

    // Profile
    profile_title: "Profile",
    profile_signed_in_as: "Signed in as",
    profile_sign_in: "Sign in",
    profile_sign_out: "Sign out",
    profile_personal_stats: "Personal Stats",
    profile_saved_items: "Saved items",
    profile_active_categories: "Active categories",
    profile_categories_short: "Categories",
    profile_support_cta_active: "Support Pocket ID again? 💛",
    profile_support_cta_inactive: "Show me some love? 💛",
    profile_support_button_active: "View more support options →",
    profile_support_button_inactive: "Support the app →",
    profile_account_section: "Account",
    profile_checking_session: "Checking account session…",
    profile_continue_google: "Continue With Google",
    profile_connecting_google: "Connecting Google…",
    profile_switch_google_account: "Switch Google Account",
    profile_switching_google: "Switching Google…",
    profile_signing_out: "Signing out…",
    profile_sync_disabled_tap_setup: "Sync disabled. Tap to set up.",
    profile_setup_sync_title: "Set up Google sync in 2 short steps",
    profile_setup_sync_body:
      "You already finished the first part by signing in with Google.",
    profile_set_sync_passphrase: "Set Sync Passphrase",
    profile_read_more: "Read More",
    profile_signin_restore_body:
      "Sign in to restore your cards on a new device and keep this wallet synced.",

    // Search
    search_placeholder: "Search cards…",
    search_no_results: "No results found",

    // Onboarding
    onboarding_welcome: "Welcome to Pocket ID",
    onboarding_get_started: "Get Started",

    // Alerts / Dialogs
    alert_cancel: "Cancel",
    alert_disable: "Disable",
    alert_disable_lock_screen_title: "Disable Lock Screen?",
    alert_disable_lock_screen_body:
      "This will allow the app content to be visible in the recent apps screen and when the app is backgrounded. Your cards and documents may be exposed.",
    alert_purchases_restored_title: "Purchases restored",
    alert_purchases_restored_body:
      "Pocket ID refreshed your RevenueCat customer info and restored any eligible purchases.",
    alert_restore_failed_title: "Restore failed",
    alert_restore_failed_fallback:
      "Pocket ID could not restore purchases right now.",
    alert_subscription_settings_failed_title:
      "Could not open subscription settings",
    alert_subscription_settings_failed_fallback:
      "Pocket ID could not open the App Store subscription page right now.",
    alert_forget_passphrase_title: "Forget sync passphrase on this device?",
    alert_forget_passphrase_body:
      "Cloud sync will pause here until you enter the passphrase again. Your encrypted data stays in Supabase, but this device will no longer be able to decrypt it.",
    alert_forget_passphrase_btn: "Forget Passphrase",
    alert_forget_passphrase_failed_title: "Could not forget passphrase",
    alert_forget_passphrase_failed_body:
      "Pocket ID couldn't remove the local sync passphrase right now. Please try again.",
    alert_sync_passphrase_required_title: "Sync passphrase required",
    alert_sync_passphrase_required_body:
      "You must set your sync passphrase first in Settings > Cloud Sync before syncing cloud data.",
    alert_syncing_body:
      "Syncing your device and encrypted cloud vault...",
    alert_delete_local_data_title: "Delete your local data?",
    alert_delete_local_data_body_signed_in:
      "This removes your synced wallet data and clears saved cards on this device. Your Google sign-in remains available, but this action cannot be undone.",
    alert_delete_local_data_body_signed_out:
      "This clears all saved cards on this device. This action cannot be undone.",
    alert_delete_data_btn: "Delete Data",
    alert_data_deleted_title: "Data deleted",
    alert_data_deleted_body_signed_in:
      "Pocket ID removed your synced wallet data and cleared the saved cards on this device.",
    alert_data_deleted_body_signed_out:
      "Pocket ID cleared all saved cards on this device.",
    alert_delete_data_failed_title: "Could not delete data",
    alert_delete_data_failed_body:
      "Pocket ID couldn't remove your saved data right now. Please try again.",
    alert_delete_account_title: "Delete account from this app?",
    alert_delete_account_body:
      "This wipes out your synced wallet data entirely, forgets your sync passphrase on this device, signs you out of Google, and resets Pocket ID to a first-time state on this device. This cannot be undone.",
    alert_delete_account_btn: "Delete Account",
    alert_delete_account_failed_title: "Could not delete account",
    alert_delete_account_failed_fallback:
      "Pocket ID couldn't remove this account right now. Please try again.",
    alert_invalid_shared_card_title: "Invalid shared card",
    alert_invalid_shared_card_body:
      "This file is not a valid Pocket ID card export.",
    alert_open_shared_card_failed_title: "Could not open shared card",
    alert_open_shared_card_failed_body:
      "Pocket ID could not read that file.",
    alert_google_signin_failed: "Google sign-in failed",
    alert_switch_google_failed: "Could not switch Google account",
    alert_signout_failed: "Could not sign out",

    // Cloud Sync Settings
    cloud_sign_in_prompt:
      "Sign in from the Profile tab to manage cloud sync settings here.",
    cloud_to_profile: "To the profile",
    cloud_setup_title: "Set up Google sync in 2 short steps",
    cloud_setup_body:
      "You already finished the first part by signing in with Google.",
    cloud_step_sign_in: "Sign in with Google",
    cloud_step_sign_in_done:
      "Done. Your account is connected and ready for secure sync.",
    cloud_step_create_passphrase: "Create your sync passphrase",
    cloud_step_passphrase_desc:
      "This passphrase encrypts your vault before anything is uploaded.",
    cloud_set_sync_passphrase: "Set Sync Passphrase",
    cloud_update_sync_passphrase: "Update Sync Passphrase",
    cloud_step_read_how: "Read how it works",
    cloud_step_read_how_desc:
      "See what Google, Supabase, and encryption each do in the flow.",
    cloud_read_more: "Read More",
    cloud_vault_enabled: "Encrypted cloud vault is enabled",
    cloud_vault_checking: "Checking encrypted cloud vault\u2026",
    cloud_vault_not_setup: "Encrypted cloud vault is not set up yet",
    cloud_vault_enabled_desc:
      "Your cards are encrypted on this device before upload, so the database stores ciphertext instead of readable card details.",
    cloud_vault_not_setup_desc:
      "Set or use a sync passphrase to encrypt cards before uploading or pulling your saved cards. Until then, cloud sync stays paused on this device to avoid sending readable card data.",
    cloud_forgetting_passphrase: "Forgetting passphrase\u2026",
    cloud_forget_passphrase_btn: "Forget Passphrase on This Device",
    cloud_syncing_data: "Syncing Cloud Data\u2026",
    cloud_sync_data_btn: "Sync Cloud Data",
    cloud_account_deletion: "Account deletion",
    cloud_account_deletion_desc:
      "Remove your synced wallet data, forget this Google sign-in on the device, and start fresh next time.",
    cloud_deleting_account: "Deleting Account\u2026",
    cloud_delete_account_btn: "Delete Account",

    // Data Management
    data_management_title: "Data Management",
    data_management_body: "Manage the card data stored on this device.",
    data_deleting_local: "Deleting data on this device\u2026",
    data_delete_local_btn: "Delete My Local Data",

    // Support Types
    support_type_monthly: "Monthly Subscription",
    support_type_lifetime: "Lifetime",
    support_type_tip: "Tip",
    support_cancel_monthly: "Cancel Monthly Subscription",

    // Credits
    credits_title: "Credits",
    credits_body: "The people behind Pocket ID.",
    credits_developed_by: "Developed by",
    credits_view_all: "View all credits",
    credits_all_rights: "all rights reserved",
    credits_thanks: "Thanks to everyone who contributed to Pocket ID.",

    // Biometric Warnings
    biometric_no_hardware:
      "Your device doesn\u2019t support biometric authentication.",
    biometric_not_enrolled:
      "No biometrics are set up on this device. Add Face ID or a fingerprint in your device settings to enable this.",

    // Search Extended
    search_empty_hint:
      "Try a bank name, ID number, membership code or card type.",

    // Passphrase Reminder Modal
    passphrase_reminder_title: "Set up your sync passphrase",
    passphrase_reminder_body:
      "You're signed in with Google, but cloud sync is paused because you haven't created a passphrase yet. Set one up now to start encrypting and syncing your cards.",
    passphrase_reminder_go_profile: "Set Sync Passphrase",
    passphrase_reminder_later: "Remind me later",

    // Support Modal
    support_modal_title: "Enjoying the app? \uD83D\uDC9B",
    support_modal_loading: "Loading support options\u2026",
    support_modal_error_title: "Could not load support",
    support_modal_thank_you: "Thank You!",
    support_modal_thank_you_body:
      "Thank you for your support! You now have access to all supporter features. Enjoy your enhanced Pocket ID experience!",
    support_modal_continue: "Continue",
    support_modal_monthly_section: "Monthly support",
    support_modal_best_ongoing: "Best for ongoing support",
    support_modal_recurring: "Recurring",
    support_modal_highlight_sustainable:
      "Small recurring support that keeps updates sustainable.",
    support_modal_highlight_manage:
      "Manage or cancel later from your store subscription settings.",
    support_modal_billed_by: "billed by",
    support_modal_active: "Active",
    support_modal_starting: "Starting\u2026",
    support_modal_start_monthly: "Start monthly",
    support_modal_manage_subscription: "Manage subscription",
    support_modal_onetime_section: "One-time support",
    support_modal_owned: "Owned",
    support_modal_added: "Added",
    support_modal_buying: "Buying\u2026",
    support_modal_unlock_forever: "Unlock forever",
    support_modal_buy: "Buy",
    support_modal_badge_lifetime: "Lifetime",
    support_modal_badge_onetime: "One-time",
    support_modal_purchase_error:
      "Pocket ID could not complete that purchase right now.",

    // CardForm Extras
    form_card_color: "CARD COLOR",
    form_cancel_btn: "Cancel",
    form_confirm_btn: "Confirm",

    // Profile Extended
    profile_not_supporter: "Not a supporter yet",
    profile_category_breakdown: "Category Breakdown",
    profile_support_body_lifetime:
      "Your lifetime support is active. You can still leave a tip to support ongoing updates.",
    profile_support_body_monthly:
      "Your monthly support is active. You can still add one-time tips for an extra thank you.",
    profile_support_body_tipper:
      "Thanks for supporting the app. You can always add another tip or go monthly.",
    profile_support_body_default:
      "Support my work and keep this app alive.",
    profile_pocket_id_user: "Pocket ID user",
  },

  mk: {
    // Tabs
    tab_home: "Почетна",
    tab_bank_cards: "Банкарски картички",
    tab_personal_docs: "Документи",
    tab_search: "Пребарај",
    tab_profile: "Профил",
    tab_settings: "Поставки",

    // Common
    common_save: "Зачувај",
    common_cancel: "Откажи",
    common_delete: "Избриши",
    common_edit: "Уреди",
    common_done: "Готово",
    common_close: "Затвори",
    common_back: "Назад",
    common_yes: "Да",
    common_no: "Не",
    common_confirm: "Потврди",
    common_loading: "Вчитување…",
    common_error: "Грешка",
    common_retry: "Обиди се повторно",
    common_or: "или",

    // Add Card
    add_card_title: "Додај",
    add_card_scan_button: "Скенирај",
    add_card_scan_beta: "Тест",
    add_card_import_button: "Увези",

    // Card Form
    form_title: "Наслов",
    form_subtitle: "Поднаслов",
    form_holder_name: "Носител",
    form_card_number: "Број на картичка",
    form_expiry: "Важи до",
    form_category: "Категорија",
    form_type: "Тип",
    form_notes: "Белешки",
    form_color: "Боја",
    form_name_placeholder: "пр. Иван Петров",
    form_number_placeholder: "пр. 1234 5678 9012 3456",
    form_expiry_placeholder: "MM/YY",
    form_notes_placeholder: "Додај белешка за оваа картичка",
    form_choose_category: "Избери категорија",
    form_choose_type: "Избери тип",
    form_select_color: "Избери боја",
    form_save_changes: "Зачувај промени",
    form_create_card: "Креирај картичка",
    form_validation_name_required: "Името е задолжително.",
    form_validation_number_required: "Бројот на картичка е задолжителен.",
    form_validation_expiry_invalid: "Форматот мора да биде MM/YY.",
    form_category_helper:
      "Прво избери поширока категорија на картичка — тоа ги менува достапните полиња подолу.",
    form_front_details: "Предна страна",
    form_back_details: "Задна страна",
    form_choose_one: "Избери една",
    form_flip_preview_hint: "Допрете ја картичката за превртување",
    form_pick_color: "Избери боја",
    form_apply: "Примени",
    form_next: "Следно",

    // Cards
    cards_saved_items: "Зачувани ставки",
    cards_no_cards_title: "Сè уште нема картички",
    cards_no_cards_body:
      "Започни со додавање на првата картичка во оваа категорија.",
    cards_add_first_card: "Додај прва картичка",
    cards_expires_label: "Истекува",
    cards_issuer_label: "Издавач",
    cards_delete_confirm_title: "Да се избрише оваа картичка?",
    cards_delete_confirm_body: "Ова дејство не може да се врати.",
    cards_edit_card: "Уреди картичка",
    cards_share_card: "Сподели картичка",
    cards_copy_number: "Копирај број",
    cards_copied: "Копирано",
    cards_manage_heading: "Управувај",
    cards_add_first_subtitle: "Допрете тука за да започнете",
    cards_demo_title: "Демо картички",
    cards_demo_body:
      "Не грижи се, овие исчезнуваат кога ќе додадеш картичка или ќе синхронизираш.",
    cards_none_in_category: "Сè уште нема картички во оваа категорија.",
    card_detail_not_found: "Картичката не е пронајдена",
    card_detail_front: "Предна",
    card_detail_back: "Задна",
    card_detail_flip_hint: "Допрете ја картичката за превртување",
    card_detail_delete_card: "Избриши картичка",
    card_detail_auto_delete_banner:
      "Оваа истечена картичка ќе биде автоматски избришана за {days} ден(а).",
    card_detail_auto_delete_today:
      "Оваа истечена картичка ќе биде автоматски избришана денес.",
    card_detail_share_preparing: "Се подготвува споделување…",
    card_detail_share_title: "Сподели картичка",
    card_detail_share_body: "Избери како сакаш да ја испратиш оваа картичка.",
    card_detail_share_image: "Слика",
    card_detail_share_image_body:
      "Сподели го стилизираниот приказ на картичката како слика.",
    card_detail_share_text: "Текст",
    card_detail_share_text_body:
      "Сподели ги полињата од картичката како обичен текст.",
    card_detail_share_file: "Pocket ID датотека",
    card_detail_share_file_body:
      "Испрати една картичка преку Gmail, Google Drive или Files и увези ја на друг уред.",
    card_detail_copy_toast_suffix: "копирано!",

    // Settings
    settings_title: "Поставки",
    settings_subtitle:
      "Управувај со изгледот на паричникот, заклучувањето и потсетниците.",

    settings_section_appearance: "Изглед",
    settings_appearance_body:
      "Избери дали апликацијата да ја следи системската тема или да остане во светол или темен режим.",
    settings_theme_system: "Систем",
    settings_theme_light: "Светло",
    settings_theme_dark: "Темно",

    settings_section_language: "Јазик",
    settings_language_body: "Избери јазик кој се користи во апликацијата.",

    settings_section_security: "Безбедност",
    settings_biometric_lock_label: "Биометриска заштита",
    settings_biometric_lock_desc:
      "Бара биометрика или лозинка на уредот кога Pocket ID е заклучен.",
    settings_block_screenshots_label: "Блокирај снимки на екран",
    settings_block_screenshots_desc:
      "Спречи снимки и снимање на екранот додека Pocket ID е отворен.",
    settings_lock_screen_label: "Заклучен екран",
    settings_lock_screen_desc:
      "Скриј ја содржината на апликацијата на екранот за неодамнешни апликации.",

    settings_section_reminders: "Потсетници",
    settings_expiry_notifications_label: "Известувања за истекување",
    settings_expiry_notifications_desc:
      "Закажи потсетници 1 месец, 2 недели и 2 дена пред истекување на картичките.",

    settings_section_cloud_sync: "Сихронизација",
    settings_cloud_sync_body:
      "Управувај со шифрираниот облак трезор, синхронизирај податоци и исчисти го уредот.",

    settings_section_support: "Твоја поддршка",
    settings_support_body: "Детали за поддршка преку app store сметката.",
    settings_support_status: "Статус",
    settings_support_active: "Активна ❤️",
    settings_support_not_yet: "Сè уште не си поддржувач",
    settings_support_type: "Тип на поддршка",
    settings_support_last_payment: "Датум на последна уплата",
    settings_support_next_renewal: "Датум на следна обнова",
    settings_support_tips_count: "Вкупен број на поддршки",
    settings_view_support_options: "Погледни опции за поддршка",
    settings_restore_purchases: "Врати купувања",

    settings_section_developer: "Акции за тестери",
    settings_send_test_notification: "Испрати тест известување (5 с)",
    settings_view_onboarding: "Прегледај го воведот повторно",

    // Profile
    profile_title: "Профил",
    profile_signed_in_as: "Најавен како",
    profile_sign_in: "Најави се",
    profile_sign_out: "Одјави се",
    profile_personal_stats: "Лична статистика",
    profile_saved_items: "Зачувани ставки",
    profile_active_categories: "Активни категории",
    profile_categories_short: "Категории",
    profile_support_cta_active: "Повторно да го поддржиш Pocket ID? 💛",
    profile_support_cta_inactive: "Дај ми поддршка? 💛",
    profile_support_button_active: "Погледни повеќе опции за поддршка →",
    profile_support_button_inactive: "Поддржи ја апликацијата →",
    profile_account_section: "Сметка",
    profile_checking_session: "Се проверува сесијата…",
    profile_continue_google: "Продолжи со Google",
    profile_connecting_google: "Се поврзува Google…",
    profile_switch_google_account: "Промени Google сметка",
    profile_switching_google: "Се менува Google…",
    profile_signing_out: "Се одјавува…",
    profile_sync_disabled_tap_setup:
      "Синхронизацијата е исклучена. Допрете за поставување.",
    profile_setup_sync_title:
      "Постави Google синхронизација во 2 кратки чекори",
    profile_setup_sync_body:
      "Првиот дел веќе е завршен со најавување преку Google.",
    profile_set_sync_passphrase: "Постави лозинка за синхронизација",
    profile_read_more: "Прочитај повеќе",
    profile_signin_restore_body:
      "Најави се за да ги вратиш картичките на нов уред и да го одржуваш паричникот синхронизиран.",

    // Search
    search_placeholder: "Пребарај картички…",
    search_no_results: "Нема резултати",

    // Onboarding
    onboarding_welcome: "Добредојдовте во Pocket ID",
    onboarding_get_started: "Почни",

    // Alerts / Dialogs
    alert_cancel: "Откажи",
    alert_disable: "Исклучи",
    alert_disable_lock_screen_title: "Исклучи заклучен екран?",
    alert_disable_lock_screen_body:
      "Ова ќе ја направи содржината на апликацијата видлива на екранот за неодамнешни апликации и кога апликацијата е во заднина. Вашите картички и документи може да бидат изложени.",
    alert_purchases_restored_title: "Купувањата се вратени",
    alert_purchases_restored_body:
      "Pocket ID ги освежи RevenueCat податоците и ги врати сите соодветни купувања.",
    alert_restore_failed_title: "Враќањето не успеа",
    alert_restore_failed_fallback:
      "Pocket ID не може да ги врати купувањата во моментов.",
    alert_subscription_settings_failed_title:
      "Не можат да се отворат поставките за претплата",
    alert_subscription_settings_failed_fallback:
      "Pocket ID не може да ја отвори страницата за претплати во моментов.",
    alert_forget_passphrase_title: "Заборави ја лозинката на овој уред?",
    alert_forget_passphrase_body:
      "Облак синхронизацијата ќе паузира тука додека повторно не ја внесете лозинката. Вашите шифрирани податоци остануваат во Supabase, но овој уред повеќе нема да може да ги дешифрира.",
    alert_forget_passphrase_btn: "Заборави лозинка",
    alert_forget_passphrase_failed_title: "Не може да се заборави лозинката",
    alert_forget_passphrase_failed_body:
      "Pocket ID не може да ја отстрани локалната лозинка за синхронизација. Обидете се повторно.",
    alert_sync_passphrase_required_title: "Потребна е лозинка за синхронизација",
    alert_sync_passphrase_required_body:
      "Мора прво да ја поставите лозинката за синхронизација во Поставки > Синхронизација пред синхронизирање.",
    alert_syncing_body:
      "Се синхронизираат вашиот уред и шифрираниот облак трезор...",
    alert_delete_local_data_title: "Избриши ги локалните податоци?",
    alert_delete_local_data_body_signed_in:
      "Ова ги отстранува синхронизираните податоци и ги брише зачуваните картички на овој уред. Google најавата останува достапна, но ова дејство не може да се врати.",
    alert_delete_local_data_body_signed_out:
      "Ова ги брише сите зачувани картички на овој уред. Ова дејство не може да се врати.",
    alert_delete_data_btn: "Избриши податоци",
    alert_data_deleted_title: "Податоците се избришани",
    alert_data_deleted_body_signed_in:
      "Pocket ID ги отстрани синхронизираните податоци и ги избриша зачуваните картички на овој уред.",
    alert_data_deleted_body_signed_out:
      "Pocket ID ги избриша сите зачувани картички на овој уред.",
    alert_delete_data_failed_title: "Не можат да се избришат податоците",
    alert_delete_data_failed_body:
      "Pocket ID не може да ги отстрани вашите зачувани податоци. Обидете се повторно.",
    alert_delete_account_title: "Избриши ја сметката од оваа апликација?",
    alert_delete_account_body:
      "Ова целосно ги брише синхронизираните податоци, ја заборавува лозинката на овој уред, ве одјавува од Google и го ресетира Pocket ID на почетна состојба. Ова не може да се врати.",
    alert_delete_account_btn: "Избриши сметка",
    alert_delete_account_failed_title: "Не може да се избрише сметката",
    alert_delete_account_failed_fallback:
      "Pocket ID не може да ја отстрани оваа сметка во моментов. Обидете се повторно.",
    alert_invalid_shared_card_title: "Невалидна споделена картичка",
    alert_invalid_shared_card_body:
      "Оваа датотека не е валиден Pocket ID извоз на картичка.",
    alert_open_shared_card_failed_title:
      "Не може да се отвори споделената картичка",
    alert_open_shared_card_failed_body:
      "Pocket ID не може да ја прочита таа датотека.",
    alert_google_signin_failed: "Google најавата не успеа",
    alert_switch_google_failed: "Не може да се промени Google сметката",
    alert_signout_failed: "Не може да се одјави",

    // Cloud Sync Settings
    cloud_sign_in_prompt:
      "Најавете се од табот Профил за да управувате со поставките за облак синхронизација тука.",
    cloud_to_profile: "Кон профил",
    cloud_setup_title: "Постави Google синхронизација во 2 кратки чекори",
    cloud_setup_body:
      "Првиот дел веќе е завршен со најавување преку Google.",
    cloud_step_sign_in: "Најави се со Google",
    cloud_step_sign_in_done:
      "Готово. Вашата сметка е поврзана и подготвена за безбедна синхронизација.",
    cloud_step_create_passphrase: "Креирај лозинка за синхронизација",
    cloud_step_passphrase_desc:
      "Оваа лозинка го шифрира трезорот пред да се подигне.",
    cloud_set_sync_passphrase: "Постави лозинка за синхронизација",
    cloud_update_sync_passphrase: "Ажурирај лозинка за синхронизација",
    cloud_step_read_how: "Прочитај како работи",
    cloud_step_read_how_desc:
      "Погледни што прават Google, Supabase и шифрирањето во текот.",
    cloud_read_more: "Прочитај повеќе",
    cloud_vault_enabled: "Шифрираниот облак трезор е вклучен",
    cloud_vault_checking: "Се проверува шифрираниот облак трезор\u2026",
    cloud_vault_not_setup: "Шифрираниот облак трезор не е поставен",
    cloud_vault_enabled_desc:
      "Вашите картички се шифрираат на овој уред пред подигање, па базата чува шифриран текст наместо читливи детали.",
    cloud_vault_not_setup_desc:
      "Постави или користи лозинка за синхронизација за шифрирање на картичките пред подигање. Дотогаш, облак синхронизацијата е паузирана за да се спречи испраќање на читливи податоци.",
    cloud_forgetting_passphrase: "Се заборавува лозинката\u2026",
    cloud_forget_passphrase_btn: "Заборави лозинка на овој уред",
    cloud_syncing_data: "Се синхронизираат облак податоци\u2026",
    cloud_sync_data_btn: "Синхронизирај облак податоци",
    cloud_account_deletion: "Бришење на сметка",
    cloud_account_deletion_desc:
      "Отстрани ги синхронизираните податоци, заборави ја Google најавата на уредот и почни одново.",
    cloud_deleting_account: "Се брише сметка\u2026",
    cloud_delete_account_btn: "Избриши сметка",

    // Data Management
    data_management_title: "Управување со податоци",
    data_management_body: "Управувај со податоците за картички на овој уред.",
    data_deleting_local: "Се бришат податоци на овој уред\u2026",
    data_delete_local_btn: "Избриши ги моите локални податоци",

    // Support Types
    support_type_monthly: "Месечна претплата",
    support_type_lifetime: "Доживотна",
    support_type_tip: "Донација",
    support_cancel_monthly: "Откажи месечна претплата",

    // Credits
    credits_title: "Заслуги",
    credits_body: "Луѓето зад Pocket ID.",
    credits_developed_by: "Развиено од",
    credits_view_all: "Погледни ги сите заслуги",
    credits_all_rights: "сите права задржани",
    credits_thanks: "Благодарност до секој кој придонесе за Pocket ID.",

    // Biometric Warnings
    biometric_no_hardware:
      "Вашиот уред не поддржува биометриска автентикација.",
    biometric_not_enrolled:
      "Нема поставена биометрика на овој уред. Додајте Face ID или отпечаток во поставките на уредот.",

    // Search Extended
    search_empty_hint:
      "Пробај име на банка, ID број, членски код или тип на картичка.",

    // Passphrase Reminder Modal
    passphrase_reminder_title: "Постави лозинка за синхронизација",
    passphrase_reminder_body:
      "Најавени сте со Google, но облак синхронизацијата е паузирана бидејќи сè уште немате лозинка. Поставете ја сега за да започнете со шифрирање и синхронизирање на картичките.",
    passphrase_reminder_go_profile: "Постави лозинка",
    passphrase_reminder_later: "Потсети ме подоцна",

    // Support Modal
    support_modal_title: "Ви се допаѓа апликацијата? \uD83D\uDC9B",
    support_modal_loading: "Се вчитуваат опции за поддршка\u2026",
    support_modal_error_title: "Не може да се вчита поддршка",
    support_modal_thank_you: "Ви Благодариме!",
    support_modal_thank_you_body:
      "Ви благодариме за поддршката! Сега имате пристап до сите функции за поддржувачи. Уживајте во подобреното Pocket ID искуство!",
    support_modal_continue: "Продолжи",
    support_modal_monthly_section: "Месечна поддршка",
    support_modal_best_ongoing: "Најдобро за постојана поддршка",
    support_modal_recurring: "Повторувачка",
    support_modal_highlight_sustainable:
      "Мала повторувачка поддршка која ги одржува ажурирањата одржливи.",
    support_modal_highlight_manage:
      "Управувај или откажи подоцна од поставките за претплата на продавницата.",
    support_modal_billed_by: "наплатено од",
    support_modal_active: "Активна",
    support_modal_starting: "Се стартува\u2026",
    support_modal_start_monthly: "Започни месечна",
    support_modal_manage_subscription: "Управувај со претплата",
    support_modal_onetime_section: "Еднократна поддршка",
    support_modal_owned: "Поседувано",
    support_modal_added: "Додадено",
    support_modal_buying: "Се купува\u2026",
    support_modal_unlock_forever: "Отклучи засекогаш",
    support_modal_buy: "Купи",
    support_modal_badge_lifetime: "Доживотна",
    support_modal_badge_onetime: "Еднократна",
    support_modal_purchase_error:
      "Pocket ID не може да го заврши купувањето во моментов.",

    // CardForm Extras
    form_card_color: "БОЈА НА КАРТИЧКА",
    form_cancel_btn: "Откажи",
    form_confirm_btn: "Потврди",

    // Profile Extended
    profile_not_supporter: "Сè уште не си поддржувач",
    profile_category_breakdown: "Преглед по категории",
    profile_support_body_lifetime:
      "Вашата доживотна поддршка е активна. Сè уште можете да оставите донација за тековни ажурирања.",
    profile_support_body_monthly:
      "Вашата месечна поддршка е активна. Сè уште можете да додадете еднократна донација.",
    profile_support_body_tipper:
      "Благодарам за поддршката. Секогаш можете да додадете уште една донација или да преминете на месечна.",
    profile_support_body_default:
      "Поддржи ја мојата работа и одржи ја оваа апликација жива.",
    profile_pocket_id_user: "Pocket ID корисник",
  },
};

/**
 * Simple t() helper. Usage:
 *   import { t } from "@/src/i18n/translations";
 *   t("settings_title", language)
 */
export function t(key: keyof TranslationKeys, lang: LanguageCode): string {
  return translations[lang][key] ?? translations.en[key] ?? key;
}
