package com.nexusnook.companion.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColors = darkColorScheme(
    primary = NexusCyan,
    secondary = NexusBlue,
    background = NexusBackgroundDark,
    surface = NexusSurfaceDark,
)

private val LightColors = lightColorScheme(
    primary = NexusBlue,
    secondary = NexusCyan,
    tertiary = NexusBlueDark,
)

@Composable
fun NexusNookTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = Typography,
        content = content,
    )
}
