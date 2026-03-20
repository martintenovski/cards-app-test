import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: 'none',
        },
        sceneStyle: {
          backgroundColor: '#EFEFEF',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Everything',
        }}
      />
      <Tabs.Screen
        name="personal-docs"
        options={{
          title: 'Personal Docs',
        }}
      />
      <Tabs.Screen
        name="bank-cards"
        options={{
          title: 'Bank Cards',
        }}
      />
    </Tabs>
  );
}