import { Tabs } from "expo-router";

import { AddCardSheet } from "@/components/AddCardSheet";
import { AppTabBar } from "@/components/AppTabBar";
import { useCardStore } from "@/store/useCardStore";

export default function TabsLayout() {
  const addCardSheetOpen = useCardStore((state) => state.addCardSheetOpen);
  const closeAddCardSheet = useCardStore((state) => state.closeAddCardSheet);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            backgroundColor: "#EFEFEF",
          },
        }}
        tabBar={(props) => <AppTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Everything",
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
          }}
        />
        <Tabs.Screen
          name="personal-docs"
          options={{
            title: "Personal Docs",
            href: null,
          }}
        />
        <Tabs.Screen
          name="bank-cards"
          options={{
            title: "Bank Cards",
            href: null,
          }}
        />
      </Tabs>
      <AddCardSheet isOpen={addCardSheetOpen} onClose={closeAddCardSheet} />
    </>
  );
}
