package com.nexusnook.companion.data.remote

import com.nexusnook.companion.data.model.AuthResponse
import com.nexusnook.companion.data.model.HealthResponse
import com.nexusnook.companion.data.model.LoginRequest
import com.nexusnook.companion.data.model.ProfileResponse
import com.nexusnook.companion.data.model.RegisterRequest
import com.nexusnook.companion.data.model.RsiConnectRequest
import com.nexusnook.companion.data.model.RsiConnectResponse
import com.nexusnook.companion.data.model.RsiSyncResponse
import com.nexusnook.companion.data.model.ServersResponse
import com.nexusnook.companion.data.model.ShipsResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface ApiService {

    @POST("api/auth/register")
    suspend fun register(@Body body: RegisterRequest): AuthResponse

    @POST("api/auth/login")
    suspend fun login(@Body body: LoginRequest): AuthResponse

    @GET("api/user/profile")
    suspend fun profile(): ProfileResponse

    @GET("api/ships")
    suspend fun ships(): ShipsResponse

    @GET("api/servers/status")
    suspend fun serverStatus(): ServersResponse

    @POST("api/rsi/connect")
    suspend fun rsiConnect(@Body body: RsiConnectRequest): RsiConnectResponse

    @POST("api/rsi/sync")
    suspend fun rsiSync(): RsiSyncResponse

    @GET("health")
    suspend fun health(): HealthResponse
}
