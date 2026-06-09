package com.ytmusic.wrapper;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Edge-to-edge display (required for Origin Island / status bar overlap)
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Keep screen on during playback
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Status bar: dark icons for light content
        WindowInsetsControllerCompat insetsController =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insetsController.setAppearanceLightStatusBars(false);
        insetsController.setAppearanceLightNavigationBars(false);

        // Configure WebView for YouTube Music
        configureWebView();
    }

    private void configureWebView() {
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();

        // Enable all media features
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Enable hardware acceleration for smooth scrolling/animations
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        // User agent: pretend to be Chrome on Android (YTM requires it)
        String ua = settings.getUserAgentString();
        if (!ua.contains("Chrome")) {
            settings.setUserAgentString(
                "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
            );
        }

        // Allow mixed content (some YTM resources may be HTTP)
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
    }

    // 🛠️ CHANGED FROM protected TO public (Fixes Java compilation constraints)
    @Override
    public void onResume() {
        super.onResume();
        // Resume WebView media when app comes to foreground
        getBridge().getWebView().onResume();
    }

    // 🛠️ CHANGED FROM protected TO public (Fixes Java compilation constraints)
    @Override
    public void onPause() {
        super.onPause();
        // Don't pause WebView on background — allow background audio
        // getBridge().getWebView().onPause(); ← intentionally commented out
    }
}
