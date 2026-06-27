package com.spotify.glassmusic

import android.app.Application
import androidx.media3.common.util.UnstableApi
import com.bumptech.glide.Glide
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.localization.Localization

@UnstableApi
class GlassMusicApp : Application() {

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize NewPipe Extractor
        // 🔥 FIX: Handling Optional return type for Localization 🔥
        val localizationOptional = Localization.fromLocalizationCode("en-IN")
        val localization = if (localizationOptional.isPresent) {
            localizationOptional.get()
        } else {
            Localization.DEFAULT
        }
        
        NewPipe.init(DownloaderImpl.init(null), localization)

        // Configure Glide
        Glide.get(this)
    }

    companion object {
        lateinit var instance: GlassMusicApp
            private set
    }
}
