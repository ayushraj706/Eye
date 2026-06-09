# ─────────────────────────────────────────────────────────────────────────────
# ProGuard / R8 rules for YTMusic Wrapper (Capacitor + WebView)
# ─────────────────────────────────────────────────────────────────────────────

# ── Capacitor core ───────────────────────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.getcapacitor.plugin.** { *; }

# ── Keep plugin bridge methods (called from JS) ──────────────────────────────
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod *;
}

# ── WebView JavaScript bridge ────────────────────────────────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── AndroidX ─────────────────────────────────────────────────────────────────
-keep class androidx.** { *; }
-dontwarn androidx.**

# ── Keep app namespace ───────────────────────────────────────────────────────
-keep class com.ytmusic.wrapper.** { *; }

# ── Media (for MediaSession support) ─────────────────────────────────────────
-keep class android.media.** { *; }
-keep class androidx.media.** { *; }
-keep class androidx.media2.** { *; }

# ── Suppress common warnings ─────────────────────────────────────────────────
-dontwarn com.getcapacitor.**
-dontwarn org.xmlpull.v1.**

# ── Keep enum values ─────────────────────────────────────────────────────────
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ── Serialization (for plugin data) ─────────────────────────────────────────
-keepclassmembers class * implements java.io.Serializable {
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
