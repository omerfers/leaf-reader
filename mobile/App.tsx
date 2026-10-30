import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { ComponentType } from "react";
import { WebView as RNWebView } from "react-native-webview";

// the published types are not React 19 aware yet
const WebView = RNWebView as unknown as ComponentType<Record<string, unknown>>;

const APP_URL = process.env.EXPO_PUBLIC_LEAF_URL ?? "https://leaf-reader-sage.vercel.app/";

export default function App() {
  const webRef = useRef<{ reload: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const reload = useCallback(() => {
    setFailed(false);
    setLoading(true);
    webRef.current?.reload();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.container}>
          <WebView
            ref={webRef}
            source={{ uri: APP_URL }}
            originWhitelist={["https://*"]}
            allowFileAccess
            allowsBackForwardNavigationGestures
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
            style={styles.web}
          />

          {loading && !failed && (
            <View style={styles.overlay} pointerEvents="none">
              <ActivityIndicator color="#8a5a34" />
              <Text style={styles.loadingText}>Opening your shelf…</Text>
            </View>
          )}

          {failed && (
            <View style={styles.overlay}>
              <Text style={styles.title}>Leaf could not reach your library</Text>
              <Text style={styles.body}>
                Check your connection and try again. Your books stay on this device.
              </Text>
              <Pressable style={styles.button} onPress={reload}>
                <Text style={styles.buttonText}>Try again</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f2ece0" },
  container: { flex: 1, backgroundColor: "#f2ece0" },
  web: { flex: 1, backgroundColor: "#f2ece0" },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 28,
    backgroundColor: "#f2ece0",
  },
  loadingText: { fontSize: 13, color: "#7c7160", letterSpacing: 0.4 },
  title: { fontSize: 20, fontWeight: "600", color: "#2a241c", textAlign: "center" },
  body: { fontSize: 14, lineHeight: 21, color: "#7c7160", textAlign: "center", maxWidth: 320 },
  button: { marginTop: 8, backgroundColor: "#8a5a34", borderRadius: 999, paddingHorizontal: 22, paddingVertical: 11 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
});
