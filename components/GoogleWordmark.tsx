import { StyleSheet, Text, View } from "react-native";

type GoogleWordmarkProps = {
  size?: number;
};

export function GoogleWordmark({ size = 16 }: GoogleWordmarkProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.letter, { color: "#4285F4", fontSize: size }]}>
        G
      </Text>
      <Text style={[styles.letter, { color: "#DB4437", fontSize: size }]}>
        o
      </Text>
      <Text style={[styles.letter, { color: "#F4B400", fontSize: size }]}>
        o
      </Text>
      <Text style={[styles.letter, { color: "#4285F4", fontSize: size }]}>
        g
      </Text>
      <Text style={[styles.letter, { color: "#0F9D58", fontSize: size }]}>
        l
      </Text>
      <Text style={[styles.letter, { color: "#DB4437", fontSize: size }]}>
        e
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  letter: {
    fontFamily: "OpenSans-Bold",
    lineHeight: 18,
  },
});
