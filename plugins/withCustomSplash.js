/**
 * withCustomSplash.js
 *
 * Execution guarantee:
 *   "expo-splash-screen" is listed EXPLICITLY in app.json plugins BEFORE this
 *   plugin. This prevents expo-splash-screen from running as an auto-plugin a
 *   second time after ours (Expo skips auto-plugins that are already explicitly
 *   listed). So the pipeline is:
 *     1. expo-splash-screen writes SplashScreen.storyboard + asset catalog  ← first
 *     2. THIS plugin overwrites that storyboard with our controlled version  ← last / wins
 *
 * What we build:
 *   - Dark background #1C1E21
 *   - App logo centred at exactly 88 × 88 pt with corner radius 20
 *   - "by"        label (13 pt regular, iOS secondary grey)  ┐ stacked near
 *   - "tenovski"  label (13 pt bold, white)                  ┘ safe-area bottom
 *
 * The image asset name is auto-detected from expo-splash-screen's own storyboard
 * so it always matches the generated asset catalog entry.
 */

const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

// ---------------------------------------------------------------------------
// Detect the image asset name from expo-splash-screen's generated storyboard.
// Falls back to "SplashScreenLogo" which is the conventional default.
// ---------------------------------------------------------------------------
function detectLogoAssetName(storyboardPath) {
  if (!fs.existsSync(storyboardPath)) return "SplashScreenLogo";
  const content = fs.readFileSync(storyboardPath, "utf-8");
  const match = content.match(/<image\s+name="([^"]+)"/);
  return match ? match[1] : "SplashScreenLogo";
}

// ---------------------------------------------------------------------------
// Storyboard template
// ---------------------------------------------------------------------------
// Colour math:
//   #1C1E21  →  r=0.110  g=0.118  b=0.129
//   #8E8E93  →  r=0.557  g=0.557  b=0.576
function buildStoryboard(logoAsset) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21701" targetRuntime="AppleCocoa Touch" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="21700"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <scene sceneID="tne-QT-ifu">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>

                            <!-- App logo: fixed 88 × 88 pt, centred, corner radius 20 -->
                            <imageView
                                clipsSubviews="YES"
                                userInteractionEnabled="NO"
                                contentMode="scaleAspectFit"
                                image="${logoAsset}"
                                translatesAutoresizingMaskIntoConstraints="NO"
                                id="HGe-GZ-ODE">
                                <userDefinedRuntimeAttributes>
                                    <userDefinedRuntimeAttribute type="number" keyPath="layer.cornerRadius">
                                        <real key="value" value="20"/>
                                    </userDefinedRuntimeAttribute>
                                    <userDefinedRuntimeAttribute type="boolean" keyPath="layer.masksToBounds">
                                        <boolean key="value" value="YES"/>
                                    </userDefinedRuntimeAttribute>
                                </userDefinedRuntimeAttributes>
                            </imageView>

                            <!-- "by" label – iOS secondary-label grey, 13 pt regular -->
                            <label
                                opaque="NO"
                                userInteractionEnabled="NO"
                                contentMode="left"
                                horizontalHuggingPriority="251"
                                verticalHuggingPriority="251"
                                text="by"
                                textAlignment="center"
                                lineBreakMode="middleTruncation"
                                baselineAdjustment="alignBaselines"
                                adjustsFontSizeToFit="NO"
                                translatesAutoresizingMaskIntoConstraints="NO"
                                id="kl1-pb-by">
                                <fontDescription key="fontDescription" type="system" pointSize="13"/>
                                <color key="textColor" red="0.557" green="0.557" blue="0.576" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>
                                <nil key="highlightedColor"/>
                            </label>

                            <!-- "tenovski" label – bold white, 13 pt -->
                            <label
                                opaque="NO"
                                userInteractionEnabled="NO"
                                contentMode="left"
                                horizontalHuggingPriority="251"
                                verticalHuggingPriority="251"
                                text="tenovski"
                                textAlignment="center"
                                lineBreakMode="middleTruncation"
                                baselineAdjustment="alignBaselines"
                                adjustsFontSizeToFit="NO"
                                translatesAutoresizingMaskIntoConstraints="NO"
                                id="kl2-pb-tn">
                                <fontDescription key="fontDescription" type="boldSystem" pointSize="13"/>
                                <color key="textColor" white="1" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
                                <nil key="highlightedColor"/>
                            </label>

                        </subviews>

                        <viewLayoutGuide key="safeAreaLayoutGuide" id="Bcu-3y-fUS"/>

                        <!-- Background: #1C1E21 -->
                        <color key="backgroundColor" red="0.110" green="0.118" blue="0.129" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>

                        <constraints>
                            <!-- Logo: centred X & Y, fixed 88 × 88 pt -->
                            <constraint firstItem="HGe-GZ-ODE" firstAttribute="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="c01"/>
                            <constraint firstItem="HGe-GZ-ODE" firstAttribute="centerY" secondItem="Ze5-6b-2t3" secondAttribute="centerY" id="c02"/>
                            <constraint firstItem="HGe-GZ-ODE" firstAttribute="width"   constant="88" id="c03"/>
                            <constraint firstItem="HGe-GZ-ODE" firstAttribute="height"  constant="88" id="c04"/>

                            <!-- "by" label: centred horizontally -->
                            <constraint firstItem="kl1-pb-by" firstAttribute="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="c05"/>

                            <!-- "tenovski" label: centred horizontally, 40 pt above safe-area bottom -->
                            <constraint firstItem="kl2-pb-tn" firstAttribute="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="c06"/>
                            <constraint firstItem="Bcu-3y-fUS" firstAttribute="bottom" secondItem="kl2-pb-tn" secondAttribute="bottom" constant="40" id="c07"/>

                            <!-- "by" sits 2 pt above "tenovski" -->
                            <constraint firstItem="kl2-pb-tn" firstAttribute="top" secondItem="kl1-pb-by" secondAttribute="bottom" constant="2" id="c08"/>
                        </constraints>
                    </view>
                </viewController>
                <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
            </objects>
            <layoutGuides/>
        </scene>
    </scenes>
    <resources>
        <image name="${logoAsset}" width="1024" height="1024"/>
    </resources>
</document>`;
}

// ---------------------------------------------------------------------------
// Expo config plugin
// ---------------------------------------------------------------------------
const withCustomSplash = (config) => {
  return withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const projectName = modConfig.modRequest.projectName;
      const platformRoot = modConfig.modRequest.platformProjectRoot; // …/ios

      // Try both naming conventions expo-splash-screen uses across SDK versions.
      const candidates = [
        path.join(platformRoot, projectName, "SplashScreen.storyboard"),
        path.join(platformRoot, projectName, "LaunchScreen.storyboard"),
      ];

      // Find the storyboard expo-splash-screen already wrote so we can read
      // the exact asset name it registered in the asset catalog.
      let storyboardPath = null;
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          storyboardPath = candidate;
          break;
        }
      }

      // If neither exists yet, create the directory and use the primary candidate.
      if (!storyboardPath) {
        storyboardPath = candidates[0];
        fs.mkdirSync(path.dirname(storyboardPath), { recursive: true });
        console.log(`[withCustomSplash] directory created for ${storyboardPath}`);
      }

      const logoAsset = detectLogoAssetName(storyboardPath);
      console.log(`[withCustomSplash] asset="${logoAsset}", writing ${storyboardPath}`);
      fs.writeFileSync(storyboardPath, buildStoryboard(logoAsset), "utf-8");

      return modConfig;
    },
  ]);
};

module.exports = withCustomSplash;
