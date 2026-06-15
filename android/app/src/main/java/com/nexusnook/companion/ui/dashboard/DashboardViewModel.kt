package com.nexusnook.companion.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nexusnook.companion.data.NexusRepository
import com.nexusnook.companion.data.UnauthorizedException
import com.nexusnook.companion.data.model.ServerStatus
import com.nexusnook.companion.data.model.Ship
import com.nexusnook.companion.data.model.User
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DashboardUiState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val user: User? = null,
    val ships: List<Ship> = emptyList(),
    val servers: List<ServerStatus> = emptyList(),
    val error: String? = null,
    val rsiBusy: Boolean = false,
)

class DashboardViewModel(private val repository: NexusRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState(loading = true))
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val messages = _messages.asSharedFlow()

    private val _unauthorized = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val unauthorized = _unauthorized.asSharedFlow()

    init {
        load()
    }

    fun load(isRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                loading = !isRefresh,
                refreshing = isRefresh,
                error = null,
            )

            val profileDeferred = async { repository.profile() }
            val shipsDeferred = async { repository.ships() }
            val serversDeferred = async { repository.serverStatus() }

            val profile = profileDeferred.await()
            val ships = shipsDeferred.await()
            val servers = serversDeferred.await()

            if (anyUnauthorized(profile, ships, servers)) {
                signOut()
                return@launch
            }

            val firstError = listOf(profile, ships, servers)
                .firstOrNull { it.isFailure }
                ?.exceptionOrNull()

            _uiState.value = _uiState.value.copy(
                loading = false,
                refreshing = false,
                user = profile.getOrNull() ?: _uiState.value.user,
                ships = ships.getOrNull() ?: _uiState.value.ships,
                servers = servers.getOrNull() ?: _uiState.value.servers,
                error = firstError?.message,
            )
        }
    }

    fun connectRsi(rsiHandle: String) {
        if (rsiHandle.isBlank()) return
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(rsiBusy = true)
            val result = repository.rsiConnect(rsiHandle.trim())
            _uiState.value = _uiState.value.copy(rsiBusy = false)
            handleRsiResult(
                result.map { it.message ?: "RSI account connected" },
            )
            if (result.isSuccess) load(isRefresh = true)
        }
    }

    fun syncRsi() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(rsiBusy = true)
            val result = repository.rsiSync()
            _uiState.value = _uiState.value.copy(rsiBusy = false)
            handleRsiResult(
                result.map { it.message ?: "Sync complete" },
            )
            if (result.isSuccess) load(isRefresh = true)
        }
    }

    private suspend fun handleRsiResult(result: Result<String>) {
        result.fold(
            onSuccess = { _messages.emit(it) },
            onFailure = { error ->
                if (error is UnauthorizedException) signOut()
                else _messages.emit(error.message ?: "Request failed")
            },
        )
    }

    private suspend fun signOut() {
        repository.logout()
        _unauthorized.emit(Unit)
    }

    private fun anyUnauthorized(vararg results: Result<*>): Boolean =
        results.any { it.exceptionOrNull() is UnauthorizedException }

    class Factory(private val repository: NexusRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            DashboardViewModel(repository) as T
    }
}
