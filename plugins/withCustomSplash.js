/**
 * Custom Expo config plugin that replaces the iOS LaunchScreen (SplashScreen.storyboard)
 * with a pixel-perfect Facebook-style splash:
 *   - Dark background (#1C1E21)
 *   - App logo centred at exactly 88 × 88 pt (fixed constraints, never stretches)
 *   - "by" label  (13 pt regular, iOS-grey)  }  stacked, near bottom safe-area
 *   - "tenovski" label (13 pt bold, white)    }
 *
 * This runs AFTER expo-splash-screen (which sets up the asset catalogue) because the
 * plugin is listed last in app.json, so our dangerous-mod write wins.
 */

const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

// ---------------------------------------------------------------------------
// Storyboard template
// ---------------------------------------------------------------------------
function buildStoryboard(logoAsset = "SplashScreenLogo") {
  // #1C1E21  →  r=28/255≈0.110  g=30/255≈0.118  b=33/255≈0.129
  // #8E8E93  →  r=142/255≈0.557 g=142/255≈0.557 b=147/255≈0.576
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0" toolsVersion="21701" targetRuntime="AppleCocoa" propertyAccessControl="none" useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES" initialViewController="01J-lp-oVM">
    <device id="retina6_12" orientation="portrait" appearance="light"/>
    <dependencies>
        <deployment identifier="iOS"/>
        <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="21700"/>
        <capability name="Safe area layout guides" minToolsVersion="9.0"/>
        <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
    </dependencies>
    <scenes>
        <!--View Controller-->
        <scene sceneID="tne-QT-ifu">
            <objects>
                <viewController id="01J-lp-oVM" sceneMemberID="viewController">
                    <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
                        <rect key="frame" x="0.0" y="0.0" width="393" height="852"/>
                        <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
                        <subviews>
                            <!-- App logo, pinned to exact 88 × 88 pt, centred on screen -->
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

                            <!-- "by" label – small, iOS secondary-label grey -->
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

                            <!-- "tenovski" label – bold, white -->
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

                        <!-- Safe-area layout guide (id matches standard Expo storyboard) -->
                        <viewLayoutGuide key="safeAreaLayoutGuide" id="Bcu-3y-fUS"/>

                        <!-- Dark background -->
                        <color key="backgroundColor" red="0.110" green="0.118" blue="0.129" alpha="1" colorSpace="custom" customColorSpace="sRGB"/>

                        <constraints>
                            <!-- Logo: centred X & Y, fixed 88 × 88 pt -->
                            <constraint firstItem="HGe-GZ-ODE" firstAttribute="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="c01"/>
                            <constraint firstItem="HGe-GZ-ODE" firstAttribute="centerY" secondItem="Ze5-6b-2t3" secondAttribute="centerY" id="c02"/>
                            <constraint firstItem="HGe-GZ-ODE" firstAttribute="width"   constant="88" id="c03"/>
                            <constraint firstItem="HGe-GZ-ODE" firstAttribute="height"  constant="88" id="c04"/>

                            <!-- "by" label: centred X -->
                            <constraint firstItem="kl1-pb-by" firstAttribute="centerX" secondItem="Ze5-6b-2t3" secondAttribute="centerX" id="c05"/>

                            <!-- "tenovski" label: centred X, 40 pt above safe-area bottom -->
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
// Plugin
// ---------------------------------------------------------------------------
const withCustomSplash = (config) => {
  return withDangerousMod(config, [
    "ios",
    (modConfig) => {
      const projectName = modConfig.modRequest.projectName;
      const platformRoot = modConfig.modRequest.platformProjectRoot; // …/ios

      // expo-splash-screen can name the storyboard either way; try both.
      const candidates = [
        path.join(platformRoot, projectName, "SplashScreen.storyboard"),
        path.join(platformRoot, projectName, "LaunchScreen.storyboard"),
      ];

      let written = false;
      for (const candidate of candidates) {
        if (fs.existsSync(path.dirname(candidate))) {
          fs.writeFileSync(candidate, buildStoryboard(), "utf-8");
          console.log(`[withCustomSplash] wrote ${candidate}`);
          written = true;
          break;
        }
      }

      if (!written) {
        // If neither directory exists yet, write to the first candidate path
        // (the directory will have been created by the time prebuild finishes).
        const fallback = candidates[0];
        fs.mkdirSync(path.dirname(fallback), { recursive: true });
        fs.writeFileSync(fallback, buildStoryboard(), "utf-8");
        console.log(`[withCustomSplash] wrote (fallback) ${fallback}`);
      }

      return modConfig;
    },
  ]);
};

module.exports = withCustomSplash;
