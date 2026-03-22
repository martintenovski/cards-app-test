module.exports = {
  dependencies: {
    'rn-mlkit-ocr': {
      platforms: {
        android: {
          sourceDir: './node_modules/rn-mlkit-ocr/android',
          packageImportPath: 'import com.rnmlkitocr.RnMlkitOcrPackage;',
          packageInstance: 'new RnMlkitOcrPackage()',
        },
        ios: {
          podspecPath: './node_modules/rn-mlkit-ocr/RnMlkitOcr.podspec',
        },
      },
    },
  },
};
