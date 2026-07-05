package com.nexusnook.companion

import android.app.Application
import com.nexusnook.companion.data.NexusRepository
import com.nexusnook.companion.data.TokenStore
import com.nexusnook.companion.data.remote.NetworkModule

/**
 * Application class acting as a tiny manual DI container. Holds the singletons
 * (TokenStore, repository) the ViewModels need.
 */
class NexusNookApp : Application() {

    val tokenStore: TokenStore by lazy { TokenStore(this) }

    val repository: NexusRepository by lazy {
        NexusRepository(
            api = NetworkModule.createApiService(tokenStore),
            tokenStore = tokenStore,
        )
    }
}
