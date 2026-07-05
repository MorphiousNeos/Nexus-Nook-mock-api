package com.nexusnook.companion

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.nexusnook.companion.ui.navigation.AppNav
import com.nexusnook.companion.ui.theme.NexusNookTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as NexusNookApp
        setContent {
            NexusNookTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    AppNav(repository = app.repository)
                }
            }
        }
    }
}
