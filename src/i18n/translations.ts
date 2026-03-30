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
  cards_stack_unlock_hint: string;
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

  settings_section_card_view: string;
  settings_card_view_body: string;
  settings_card_view_stack: string;
  settings_card_view_list: string;
  settings_card_view_stack_hint: string;

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
    cards_stack_unlock_hint: "Animated stack unlocks with 4 or more cards.",
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

    settings_section_card_view: "Card View",
    settings_card_view_body:
      "Choose how cards are displayed on the home screen.",
    settings_card_view_stack: "Animated Stack",
    settings_card_view_list: "List",
    settings_card_view_stack_hint:
      "Animated stack unlocks with 4 or more saved cards.",

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
    cards_stack_unlock_hint:
      "Анимираниот приказ се отклучува со 4 или повеќе картички.",
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

    settings_section_card_view: "Приказ на картички",
    settings_card_view_body:
      "Избери како се прикажуваат картичките на почетниот екран.",
    settings_card_view_stack: "Анимиран приказ",
    settings_card_view_list: "Листа",
    settings_card_view_stack_hint:
      "Анимираниот приказ се отклучува со 4 или повеќе зачувани картички.",

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
    profile_support_cta_inactive: "Покажи ми малку љубов? 💛",
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
