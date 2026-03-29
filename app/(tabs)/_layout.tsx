import { Tabs } from "expo-router";

import { AddCardSheet } from "@/components/AddCardSheet";
import { AppTabBar } from "@/components/AppTabBar";
import { useTranslation } from "@/src/hooks/useTranslation";
import { useCardStore } from "@/store/useCardStore";
import { APP_THEME, resolveTheme } from "@/utils/theme";
import { useColorScheme } from "react-native";

export default function TabsLayout() {
  const tr = useTranslation();
  const addCardSheetOpen = useCardStore((state) => state.addCardSheetOpen);
  const closeAddCardSheet = useCardStore((state) => state.closeAddCardSheet);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: colors.background,
          },
        }}
        tabBar={(props) => <AppTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: tr("tab_home"),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: tr("tab_search"),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: tr("tab_profile"),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: tr("tab_settings"),
          }}
        />
        <Tabs.Screen
          name="personal-docs"
          options={{
            title: tr("tab_personal_docs"),
            href: null,
          }}
        />
        <Tabs.Screen
          name="bank-cards"
          options={{
            title: tr("tab_bank_cards"),
            href: null,
          }}
        />
      </Tabs>
      <AddCardSheet isOpen={addCardSheetOpen} onClose={closeAddCardSheet} />
    </>
  );
}
