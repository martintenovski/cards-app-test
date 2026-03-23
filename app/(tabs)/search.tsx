import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { ExpiryBadge } from "@/components/ExpiryBadge";
import { useCardStore } from "@/store/useCardStore";
import { getCategoryLabel } from "@/types/card";
import { APP_THEME, resolveTheme } from "@/utils/theme";
import { supportsValidityBadge } from "@/utils/expiry";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const cards = useCardStore((state) => state.cards);
  const themePreference = useCardStore((state) => state.themePreference);
  const deviceScheme = useColorScheme();
  const resolvedTheme = resolveTheme(themePreference, deviceScheme);
  const colors = APP_THEME[resolvedTheme];

  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalizedQuery) {
      return cards;
    }

    return cards.filter((card) => {
      const haystack = [
        card.title,
        card.name,
        card.issuer,
        card.primaryValue,
        card.secondaryValue,
        getCategoryLabel(card.category),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [cards, normalizedQuery]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Search</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Find any saved card or document instantly.
        </Text>
      </View>

      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Feather name="search" size={18} color={colors.textSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name, issuer, type or number"
          placeholderTextColor={colors.textSoft}
          style={[styles.input, { color: colors.text }]}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {results.length === 0 ? (
          <View
            style={[styles.emptyState, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No matches
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              Try a bank name, ID number, membership code or card type.
            </Text>
          </View>
        ) : (
          results.map((card) => (
            <Pressable
              key={card.id}
              onPress={() =>
                router.push({
                  pathname: "/card-detail",
                  params: { id: card.id },
                })
              }
              style={[
                styles.resultCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.resultHeader}>
                <View style={styles.resultTextBlock}>
                  <Text
                    style={[styles.resultTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {card.title}
                  </Text>
                  <Text
                    style={[styles.resultMeta, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {getCategoryLabel(card.category)}
                  </Text>
                </View>
                {supportsValidityBadge(card) ? (
                  <ExpiryBadge
                    card={card}
                    compact
                    appearance={
                      resolvedTheme === "light" ? "surface" : "default"
                    }
                  />
                ) : null}
              </View>
              <Text
                style={[styles.resultPrimary, { color: colors.text }]}
                numberOfLines={1}
              >
                {card.name}
              </Text>
              <Text
                style={[styles.resultSecondary, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {[card.issuer, card.primaryValue].filter(Boolean).join(" • ")}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 25,
    paddingTop: 25,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    marginTop: 8,
  },
  searchBox: {
    marginHorizontal: 25,
    marginTop: 22,
    marginBottom: 8,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontFamily: "ReadexPro-Regular",
    fontSize: 16,
    padding: 0,
  },
  content: {
    paddingHorizontal: 25,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 14,
  },
  emptyState: {
    borderRadius: 28,
    padding: 24,
  },
  emptyTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 22,
  },
  emptyBody: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  resultCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 18,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  resultTextBlock: {
    flex: 1,
  },
  resultTitle: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 18,
  },
  resultMeta: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    marginTop: 2,
  },
  resultPrimary: {
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
    marginTop: 14,
  },
  resultSecondary: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 14,
    marginTop: 6,
  },
});
