package com.nexusnook.companion.data

import com.nexusnook.companion.data.model.AuthResponse
import com.nexusnook.companion.data.model.LoginRequest
import com.nexusnook.companion.data.model.RegisterRequest
import com.nexusnook.companion.data.model.RsiConnectRequest
import com.nexusnook.companion.data.model.RsiConnectResponse
import com.nexusnook.companion.data.model.RsiSyncResponse
import com.nexusnook.companion.data.model.ServerStatus
import com.nexusnook.companion.data.model.Ship
import com.nexusnook.companion.data.model.User
import com.nexusnook.companion.data.remote.ApiService
import kotlinx.coroutines.flow.Flow
import retrofit2.HttpException

/** Thrown when the backend returns 401; callers should log out. */
class UnauthorizedException : Exception("Unauthorized")

class NexusRepository(
    private val api: ApiService,
    private val tokenStore: TokenStore,
) {
    val tokenFlow: Flow<String?> = tokenStore.tokenFlow

    suspend fun register(username: String, email: String, password: String): Result<User> =
        runCatchingApi {
            val res = api.register(RegisterRequest(username, email, password))
            res.persistTokenOrThrow()
        }

    suspend fun login(email: String, password: String): Result<User> =
        runCatchingApi {
            val res = api.login(LoginRequest(email, password))
            res.persistTokenOrThrow()
        }

    suspend fun logout() = tokenStore.clear()

    suspend fun profile(): Result<User> =
        runCatchingApi { api.profile().user }

    suspend fun ships(): Result<List<Ship>> =
        runCatchingApi { api.ships().ships }

    suspend fun serverStatus(): Result<List<ServerStatus>> =
        runCatchingApi { api.serverStatus().servers }

    suspend fun rsiConnect(rsiEmail: String): Result<RsiConnectResponse> =
        runCatchingApi { api.rsiConnect(RsiConnectRequest(rsiEmail)) }

    suspend fun rsiSync(): Result<RsiSyncResponse> =
        runCatchingApi { api.rsiSync() }

    private suspend fun AuthResponse.persistTokenOrThrow(): User {
        val t = token
        val u = user
        if (t.isNullOrBlank() || u == null) {
            error(message ?: "Authentication failed")
        }
        tokenStore.saveToken(t)
        return u
    }

    private inline fun <T> runCatchingApi(block: () -> T): Result<T> =
        try {
            Result.success(block())
        } catch (e: HttpException) {
            if (e.code() == 401) Result.failure(UnauthorizedException())
            else Result.failure(e)
        } catch (e: Exception) {
            Result.failure(e)
        }
}
