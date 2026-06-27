package com.spotify.glassmusic.ui

import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.SeekBar
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import com.bumptech.glide.Glide
import jp.wasabeef.glide.transformations.BlurTransformation
import com.spotify.glassmusic.R
import com.spotify.glassmusic.databinding.ActivityPlayerBinding
import com.spotify.glassmusic.player.MusicPlayerManager
import java.util.concurrent.TimeUnit

@UnstableApi
class PlayerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPlayerBinding
    private lateinit var playerManager: MusicPlayerManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.setFlags(
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        )

        binding = ActivityPlayerBinding.inflate(layoutInflater)
        setContentView(binding.root)

        playerManager = MusicPlayerManager.getInstance(this)

        setupControls()
        setupObservers()
    }

    private fun setupControls() {
        binding.btnBack.setOnClickListener { finish() }

        binding.btnPlayPause.setOnClickListener {
            playerManager.playPause()
        }

        binding.btnPrevious.setOnClickListener {
            playerManager.previous()
            animateButton(binding.btnPrevious)
        }

        binding.btnNext.setOnClickListener {
            playerManager.next()
            animateButton(binding.btnNext)
        }

        binding.btnShuffle.setOnClickListener {
            playerManager.toggleShuffle()
        }

        binding.btnRepeat.setOnClickListener {
            playerManager.toggleRepeat()
        }

        binding.seekBar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                if (fromUser) {
                    binding.tvCurrentTime.text = formatTime(progress.toLong())
                }
            }
            override fun onStartTrackingTouch(seekBar: SeekBar?) {}
            override fun onStopTrackingTouch(seekBar: SeekBar?) {
                seekBar?.let { playerManager.seekTo(it.progress.toLong()) }
            }
        })

        binding.btnQueue.setOnClickListener { /* Show queue bottom sheet */ }

        binding.btnLyrics.setOnClickListener { toggleLyrics() }

        binding.btnFavorite.setOnClickListener {
            animateButton(binding.btnFavorite)
        }
    }

    private fun setupObservers() {
        playerManager.currentSong.observe(this) { song ->
            song?.let {
                binding.tvTitle.text = it.title
                binding.tvArtist.text = it.artist
                binding.tvAlbum.text = it.album.ifEmpty { "Single" }

                Glide.with(this)
                    .load(it.thumbnailUrl)
                    .transform(BlurTransformation(50, 3))
                    .into(binding.bgBlur)

                Glide.with(this)
                    .load(it.thumbnailUrl)
                    .placeholder(R.drawable.ic_album_art)
                    .into(binding.ivAlbumArt)

                binding.seekBar.max = it.duration.toInt()
                binding.tvTotalTime.text = formatTime(it.duration)
            }
        }

        playerManager.isPlaying.observe(this) { isPlaying ->
            binding.btnPlayPause.setImageResource(
                if (isPlaying) R.drawable.ic_pause_circle else R.drawable.ic_play_circle
            )
            if (isPlaying) startAlbumArtRotation() else stopAlbumArtRotation()
        }

        playerManager.currentPosition.observe(this) { position ->
            binding.seekBar.progress = position.toInt()
            binding.tvCurrentTime.text = formatTime(position)
        }

        playerManager.duration.observe(this) { duration ->
            if (duration > 0) {
                binding.seekBar.max = duration.toInt()
                binding.tvTotalTime.text = formatTime(duration)
            }
        }

        playerManager.isShuffle.observe(this) { isShuffle ->
            binding.btnShuffle.alpha = if (isShuffle) 1.0f else 0.5f
        }

        playerManager.repeatMode.observe(this) { mode ->
            when (mode) {
                Player.REPEAT_MODE_OFF -> binding.btnRepeat.setImageResource(R.drawable.ic_repeat)
                Player.REPEAT_MODE_ALL -> binding.btnRepeat.setImageResource(R.drawable.ic_repeat_on)
                Player.REPEAT_MODE_ONE -> binding.btnRepeat.setImageResource(R.drawable.ic_repeat_one)
            }
        }
    }

    private fun toggleLyrics() {
        val isVisible = binding.lyricsContainer.visibility == View.VISIBLE
        if (isVisible) {
            binding.lyricsContainer.animate().alpha(0f).setDuration(300)
                .withEndAction { binding.lyricsContainer.visibility = View.GONE }.start()
        } else {
            binding.lyricsContainer.visibility = View.VISIBLE
            binding.lyricsContainer.animate().alpha(1f).setDuration(300).start()
        }
    }

    private fun startAlbumArtRotation() {
        binding.ivAlbumArt.animate()
            .rotationBy(360f)
            .setDuration(20000)
            .withEndAction { startAlbumArtRotation() }
            .start()
    }

    private fun stopAlbumArtRotation() {
        binding.ivAlbumArt.animate().cancel()
    }

    private fun animateButton(view: View) {
        view.animate().scaleX(0.8f).scaleY(0.8f).setDuration(100)
            .withEndAction {
                view.animate().scaleX(1f).scaleY(1f).setDuration(100).start()
            }.start()
    }

    private fun formatTime(ms: Long): String {
        val minutes = TimeUnit.MILLISECONDS.toMinutes(ms)
        val seconds = TimeUnit.MILLISECONDS.toSeconds(ms) % 60
        return String.format("%02d:%02d", minutes, seconds)
    }

    override fun onDestroy() {
        super.onDestroy()
        binding.ivAlbumArt.animate().cancel()
    }
}
