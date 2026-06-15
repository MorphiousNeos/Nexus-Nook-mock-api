package com.nexusnook.companion

/**
 * App-wide configuration.
 *
 * BASE_URL comes from BuildConfig (set in app/build.gradle.kts). The dev default
 * `http://10.0.2.2:3001` is the Android emulator alias for the host machine's
 * loopback (localhost). On a physical device, replace it with your machine's LAN
 * IP (e.g. http://192.168.1.50:3001) and rebuild.
 */
object Config {
    val BASE_URL: String = BuildConfig.BASE_URL
}
