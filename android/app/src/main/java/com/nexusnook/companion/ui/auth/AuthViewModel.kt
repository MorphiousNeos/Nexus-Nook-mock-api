package com.nexusnook.companion.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.nexusnook.companion.data.NexusRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface AuthState {
    data object Loading : AuthState
    data object LoggedOut : AuthState
    data object Authenticated : AuthState
}

data class AuthUiState(
    val submitting: Boolean = false,
    val error: String? = null,
)

class AuthViewModel(private val repository: NexusRepository) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            repository.tokenFlow.collect { token ->
                _authState.value =
                    if (token.isNullOrBlank()) AuthState.LoggedOut else AuthState.Authenticated
            }
        }
    }

    fun login(email: String, password: String) = submit {
        repository.login(email.trim(), password)
    }

    fun register(username: String, email: String, password: String) = submit {
        repository.register(username.trim(), email.trim(), password)
    }

    fun logout() {
        viewModelScope.launch { repository.logout() }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }

    private fun submit(block: suspend () -> Result<*>) {
        viewModelScope.launch {
            _uiState.value = AuthUiState(submitting = true)
            val result = block()
            _uiState.value = result.fold(
                onSuccess = { AuthUiState(submitting = false) },
                onFailure = { AuthUiState(submitting = false, error = it.message ?: "Request failed") },
            )
            // authState updates reactively via tokenFlow on success.
        }
    }

    class Factory(private val repository: NexusRepository) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T =
            AuthViewModel(repository) as T
    }
}
