package com.nexusnook.companion.data.remote

import com.nexusnook.companion.data.TokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Attaches `Authorization: Bearer <jwt>` to every request when a token is present.
 * Auth + public status endpoints simply work without one (server ignores it).
 */
class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokenStore.currentToken() }
        val request = chain.request()
        val authed = if (!token.isNullOrBlank()) {
            request.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            request
        }
        return chain.proceed(authed)
    }
}
