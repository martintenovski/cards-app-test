import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import type { ComponentType } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { AppPreviewShield } from "@/components/AppPreviewShield";
import { useCardStore } from "@/store/useCardStore";
import {
  FIELD_SCAN_CONFIG,
  getFieldForScanTarget,
  scanImageForField,
  type FieldScanTarget,
} from "@/utils/selectiveScanner";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VIEWFINDER_WIDTH = SCREEN_WIDTH - 48;
const VIEWFINDER_HEIGHT = VIEWFINDER_WIDTH * 0.63;
const CORNER_SIZE = 22;
const CORNER_THICKNESS = 3;
const SCAN_TARGET_WIDTH = 1600;

type CameraPermissionResponse = {
  granted?: boolean;
};

function isFieldScanTarget(
  value: string | undefined,
): value is FieldScanTarget {
  return Boolean(value && value in FIELD_SCAN_CONFIG);
}

export default function CardScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    requestId?: string;
    target?: string;
  }>();
  const setLastFieldScanResult = useCardStore(
    (state) => state.setLastFieldScanResult,
  );
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraModuleErrorMessage, setCameraModuleErrorMessage] = useState("");
  const [CameraViewComponent, setCameraViewComponent] =
    useState<ComponentType<any> | null>(null);
  const cameraRef = useRef<any>(null);

  const target = isFieldScanTarget(params.target)
    ? params.target
    : "bank_card_number";
  const requestId =
    typeof params.requestId === "string" ? params.requestId : "";
  const config = FIELD_SCAN_CONFIG[target];

  const handleClose = () => {
    if (isCameraActive) {
      setIsCameraActive(false);
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.dismissTo("/");
  };

  const loadCameraModule = async (): Promise<
    | { status: "granted" }
    | { status: "denied" }
    | { status: "unavailable"; message: string }
  > => {
    try {
      const expoCamera = await import("expo-camera");

      setCameraViewComponent(() => expoCamera.CameraView);

      const currentPermission: CameraPermissionResponse =
        await expoCamera.Camera.getCameraPermissionsAsync();
      if (currentPermission.granted) {
        return { status: "granted" };
      }

      const requestedPermission: CameraPermissionResponse =
        await expoCamera.Camera.requestCameraPermissionsAsync();
      return requestedPermission.granted
        ? { status: "granted" }
        : { status: "denied" };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Expo camera native module is not available.";
      setCameraModuleErrorMessage(message);
      return { status: "unavailable", message };
    }
  };

  const handleStartScanner = async () => {
    const result = await loadCameraModule();

    if (result.status !== "granted") {
      if (result.status === "unavailable") {
        Alert.alert(
          "Camera module unavailable",
          "This build does not include expo-camera yet. Rebuild the native app and reopen it." +
            `\n\nDetails: ${result.message}`,
        );
      } else {
        Alert.alert(
          "Camera access required",
          "Please enable camera access in Settings to scan this field.",
        );
      }
      return;
    }

    setIsCameraActive(true);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) {
      return;
    }

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!photo?.uri) {
        throw new Error("Could not capture photo.");
      }

      const preparedImageUri = await prepareCapturedImageForScan(photo);
      const value = await scanImageForField(preparedImageUri, target);

      if (!requestId) {
        throw new Error(
          "Missing scan request context. Reopen the scanner from the form and try again.",
        );
      }

      setLastFieldScanResult({
        requestId,
        field: getFieldForScanTarget(target),
        target,
        value,
      });
      router.back();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      Alert.alert("Scan error", message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isCameraActive) {
    if (!CameraViewComponent) {
      return (
        <SafeAreaView style={styles.root}>
          <View style={styles.header}>
            <Pressable
              onPress={handleClose}
              style={styles.headerButton}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerTitle}>{config.title}</Text>
            <View style={styles.headerButton} />
          </View>

          <View style={styles.heroWrap}>
            <View style={styles.heroCard}>
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons
                  name="camera-off-outline"
                  size={42}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.heroTitle}>Camera needs a rebuild</Text>
              <Text style={styles.heroSubtitle}>
                This build was launched without the native camera module, so
                field scanning cannot open yet.
              </Text>
              <Text style={styles.helperText}>
                Rebuild the native app with the current camera and ML Kit
                dependencies, then reopen it.
                {cameraModuleErrorMessage
                  ? `\n\n${cameraModuleErrorMessage}`
                  : ""}
              </Text>
            </View>
          </View>
          <AppPreviewShield />
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            style={styles.headerButton}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{config.title}</Text>
          <View style={styles.headerButton} />
        </View>

        <Text style={styles.cameraInstruction}>{config.captureHint}</Text>

        <View style={styles.cameraFrameWrap}>
          <CameraViewComponent
            ref={cameraRef}
            style={styles.cameraFrame}
            facing="back"
          />

          <View pointerEvents="none" style={styles.viewfinderOverlay}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
          </View>
        </View>

        <View
          style={[styles.bottomPanel, { paddingBottom: insets.bottom + 18 }]}
        >
          <Text style={styles.bottomPanelTitle}>{config.title}</Text>
          <Text style={styles.bottomPanelCopy}>{config.description}</Text>

          <Pressable
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            <Text style={styles.captureButtonText}>
              {isProcessing ? "Scanning..." : "Capture"}
            </Text>
          </Pressable>

          {isProcessing ? (
            <View style={styles.processingRow}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.processingText}>Extracting field...</Text>
            </View>
          ) : null}
        </View>
        <AppPreviewShield />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={handleClose}
          style={styles.headerButton}
          hitSlop={12}
        >
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.heroWrap}>
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Feather name="camera" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>{config.title}</Text>
          <Text style={styles.heroSubtitle}>{config.description}</Text>
          <Text style={styles.helperText}>{config.captureHint}</Text>

          <Pressable style={styles.heroButton} onPress={handleStartScanner}>
            <Text style={styles.heroButtonText}>Open Camera</Text>
          </Pressable>
        </View>
      </View>
      <AppPreviewShield />
    </SafeAreaView>
  );
}

async function prepareCapturedImageForScan(photo: {
  uri: string;
  width?: number;
  height?: number;
}) {
  const imageWidth = photo.width ?? VIEWFINDER_WIDTH;
  const imageHeight = photo.height ?? VIEWFINDER_HEIGHT;
  const cropWidth = imageWidth * 0.84;
  const cropHeight = cropWidth * 0.63;
  const originX = Math.max(0, (imageWidth - cropWidth) / 2);
  const originY = Math.max(0, (imageHeight - cropHeight) / 2);
  const targetWidth = Math.min(SCAN_TARGET_WIDTH, cropWidth);
  const targetHeight = Math.round((cropHeight / cropWidth) * targetWidth);

  const manipulated = await manipulateAsync(
    photo.uri,
    [
      {
        crop: {
          originX,
          originY,
          width: cropWidth,
          height: cropHeight,
        },
      },
      {
        resize: {
          width: targetWidth,
          height: targetHeight,
        },
      },
    ],
    {
      compress: 1,
      format: SaveFormat.JPEG,
    },
  );

  return manipulated.uri;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F1012",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontFamily: "ReadexPro-Medium",
    fontSize: 18,
    marginHorizontal: 12,
  },
  heroWrap: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  heroCard: {
    borderRadius: 30,
    backgroundColor: "#17191D",
    paddingHorizontal: 24,
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 18,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontFamily: "ReadexPro-Bold",
    fontSize: 28,
    lineHeight: 32,
  },
  heroSubtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.76)",
    fontFamily: "OpenSans-Regular",
    fontSize: 15,
    lineHeight: 23,
  },
  helperText: {
    marginTop: 16,
    color: "rgba(255,255,255,0.54)",
    fontFamily: "OpenSans-Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  heroButton: {
    marginTop: 26,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    alignItems: "center",
  },
  heroButtonText: {
    color: "#111215",
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
  },
  cameraInstruction: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "OpenSans-Regular",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 24,
    marginBottom: 18,
  },
  cameraFrameWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  cameraFrame: {
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
    borderRadius: 28,
    overflow: "hidden",
  },
  viewfinderOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinder: {
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
    borderRadius: 28,
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: "#FFFFFF",
  },
  cornerTopLeft: {
    top: 16,
    left: 16,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTopRight: {
    top: 16,
    right: 16,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  bottomPanel: {
    marginTop: "auto",
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  bottomPanelTitle: {
    color: "#FFFFFF",
    fontFamily: "ReadexPro-Medium",
    fontSize: 18,
  },
  bottomPanelCopy: {
    marginTop: 8,
    color: "rgba(255,255,255,0.62)",
    fontFamily: "OpenSans-Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  captureButton: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    alignItems: "center",
  },
  captureButtonText: {
    color: "#111215",
    fontFamily: "ReadexPro-Medium",
    fontSize: 16,
  },
  processingRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  processingText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "OpenSans-Regular",
    fontSize: 14,
  },
});
