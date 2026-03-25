import type { PropsWithChildren, ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ENTER_MS = 220;
const EXIT_MS = 170;

type FocusOverlayModalProps = PropsWithChildren<{
  visible: boolean;
  onDismiss: () => void;
  backgroundColor: string;
  hintColor: string;
  hint?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function FocusOverlayModal({
  visible,
  onDismiss,
  backgroundColor,
  hintColor,
  hint,
  contentContainerStyle,
  children,
}: FocusOverlayModalProps) {
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(visible);
  const [shouldRenderContent, setShouldRenderContent] = useState(visible);

  const bgOpacity = useSharedValue(visible ? 1 : 0);
  const contentScale = useSharedValue(visible ? 1 : 0.88);
  const contentOpacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (visible) {
      setShouldRenderContent(true);
      setModalVisible(true);
      bgOpacity.value = withTiming(1, { duration: ENTER_MS });
      contentScale.value = withTiming(1, { duration: ENTER_MS });
      contentOpacity.value = withTiming(1, { duration: ENTER_MS });
      return;
    }

    bgOpacity.value = withTiming(0, { duration: EXIT_MS });
    contentScale.value = withTiming(0.88, { duration: EXIT_MS });
    contentOpacity.value = withTiming(0, { duration: EXIT_MS }, (done) => {
      if (!done) {
        return;
      }

      runOnJS(setShouldRenderContent)(false);
      runOnJS(setModalVisible)(false);
    });
  }, [bgOpacity, contentOpacity, contentScale, visible]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  return (
    <Modal
      transparent
      visible={modalVisible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, bgStyle, { backgroundColor }]}
        pointerEvents="none"
      />

      <Pressable style={styles.container} onPress={onDismiss}>
        {shouldRenderContent ? (
          <Pressable onPress={() => {}} style={styles.contentShield}>
            <Animated.View
              style={[
                styles.contentWrap,
                contentAnimStyle,
                contentContainerStyle,
              ]}
            >
              {children}
            </Animated.View>
          </Pressable>
        ) : null}
      </Pressable>

      {hint ? (
        <View
          style={[styles.hintWrap, { bottom: insets.bottom + 28 }]}
          pointerEvents="none"
        >
          <Animated.Text style={[styles.hint, { color: hintColor }, bgStyle]}>
            {hint}
          </Animated.Text>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  contentShield: {
    width: "100%",
    alignItems: "center",
  },
  contentWrap: {
    width: "100%",
  },
  hintWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  hint: {
    fontFamily: "ReadexPro-Regular",
    fontSize: 13,
    textAlign: "center",
  },
});
