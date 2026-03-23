import { Feather } from "@expo/vector-icons";
import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type FormSheetScaffoldProps = PropsWithChildren<{
  title: string;
  backgroundColor: string;
  titleColor: string;
  closeColor: string;
  handleColor: string;
  onClose: () => void;
}>;

export function FormSheetScaffold({
  title,
  backgroundColor,
  titleColor,
  closeColor,
  handleColor,
  onClose,
  children,
}: FormSheetScaffoldProps) {
  return (
    <View style={[styles.sheet, { backgroundColor }]}>
      <View style={styles.handleArea}>
        <View style={[styles.handle, { backgroundColor: handleColor }]} />
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
          <Feather name="x" size={22} color={closeColor} />
        </Pressable>
      </View>

      {children}
    </View>
  );
}

export const formSheetScaffoldStyles = StyleSheet.create({
  positionedSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
});

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  handleArea: {
    width: "100%",
    paddingTop: 12,
    paddingBottom: 6,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "ReadexPro-Bold",
    fontSize: 22,
    color: "#EFEFEF",
  },
  closeBtn: {
    padding: 4,
  },
});
