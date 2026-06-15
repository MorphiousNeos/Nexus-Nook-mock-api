package com.nexusnook.companion.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nexusnook.companion.data.NexusRepository
import com.nexusnook.companion.ui.auth.AuthState
import com.nexusnook.companion.ui.auth.AuthViewModel
import com.nexusnook.companion.ui.auth.LoginScreen
import com.nexusnook.companion.ui.dashboard.DashboardScreen
import com.nexusnook.companion.ui.dashboard.DashboardViewModel

@Composable
fun AppNav(repository: NexusRepository) {
    val authViewModel: AuthViewModel = viewModel(factory = AuthViewModel.Factory(repository))
    val authState by authViewModel.authState.collectAsStateWithLifecycle()

    when (authState) {
        AuthState.Loading -> LoadingScreen()
        AuthState.LoggedOut -> LoginScreen(viewModel = authViewModel)
        AuthState.Authenticated -> {
            val dashboardViewModel: DashboardViewModel = viewModel(
                factory = DashboardViewModel.Factory(repository),
            )
            DashboardScreen(
                viewModel = dashboardViewModel,
                onLoggedOut = { authViewModel.logout() },
            )
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}
