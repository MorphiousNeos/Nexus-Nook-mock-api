package com.nexusnook.companion.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: Int,
    val username: String,
    val email: String,
    val rsiConnected: Boolean = false,
    @SerialName("rsi_connected") val rsiConnectedSnake: Boolean = false,
    @SerialName("rsi_handle") val rsiHandle: String? = null,
    @SerialName("rsi_organization") val rsiOrganization: String? = null,
    @SerialName("last_rsi_sync") val lastRsiSync: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
) {
    /** True if the account is RSI-linked, regardless of which field the endpoint populated. */
    val isRsiConnected: Boolean get() = rsiConnected || rsiConnectedSnake
}

@Serializable
data class Ship(
    val id: Int,
    val name: String,
    val manufacturer: String,
    val type: String? = null,
    val cargo: Int? = null,
    val crew: Int? = null,
    val speed: Int? = null,
    val price: Double? = null,
    val pledge: String? = null,
    val status: String? = null,
    val location: String? = null,
    val insurance: String? = null,
)

@Serializable
data class ServerStatus(
    val region: String,
    val status: String,
    val players: Int? = null,
    val latency: Int? = null,
    val capacity: Int? = null,
)

@Serializable
data class AuthResponse(
    val success: Boolean = false,
    val token: String? = null,
    val user: User? = null,
    val message: String? = null,
)

@Serializable
data class ProfileResponse(
    val user: User,
)

@Serializable
data class ShipsResponse(
    val ships: List<Ship> = emptyList(),
)

@Serializable
data class ServersResponse(
    val servers: List<ServerStatus> = emptyList(),
)

@Serializable
data class HealthResponse(
    val status: String,
    val timestamp: String? = null,
    val service: String? = null,
)

// --- Request bodies ---

@Serializable
data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String,
)

@Serializable
data class LoginRequest(
    val email: String,
    val password: String,
)

@Serializable
data class RsiConnectRequest(
    // Public RSI citizen handle only — never a password. See docs/COMPLIANCE.md.
    val rsiHandle: String,
)

// --- RSI responses ---

@Serializable
data class RsiConnectData(
    val handle: String? = null,
    val organization: String? = null,
    val shipsImported: Int? = null,
)

@Serializable
data class RsiConnectResponse(
    val success: Boolean = false,
    val message: String? = null,
    val data: RsiConnectData? = null,
)

@Serializable
data class RsiSyncResponse(
    val success: Boolean = false,
    val message: String? = null,
    val timestamp: String? = null,
)
