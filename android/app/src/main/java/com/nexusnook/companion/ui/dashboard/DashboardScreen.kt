package com.nexusnook.companion.ui.dashboard

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.nexusnook.companion.data.model.ServerStatus
import com.nexusnook.companion.data.model.Ship
import com.nexusnook.companion.data.model.User

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onLoggedOut: () -> Unit,
) {
    val ui by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    androidx.compose.runtime.LaunchedEffect(Unit) {
        viewModel.messages.collect { snackbarHostState.showSnackbar(it) }
    }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        viewModel.unauthorized.collect { onLoggedOut() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Nexus Nook") },
                actions = {
                    IconButton(onClick = { viewModel.load(isRefresh = true) }) {
                        Icon(Icons.Filled.Refresh, contentDescription = "Refresh")
                    }
                    IconButton(onClick = onLoggedOut) {
                        Icon(
                            Icons.AutoMirrored.Filled.Logout,
                            contentDescription = "Log out",
                        )
                    }
                },
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { padding ->
        if (ui.loading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { ProfileHeader(ui.user) }

            ui.error?.let { error ->
                item {
                    Text(
                        error,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }

            item { RsiCard(busy = ui.rsiBusy, viewModel = viewModel) }

            item { SectionTitle("Server Status") }
            if (ui.servers.isEmpty()) {
                item { Text("No server data.", style = MaterialTheme.typography.bodyMedium) }
            } else {
                items(ui.servers, key = { it.region }) { ServerRow(it) }
            }

            item { SectionTitle("My Ships (${ui.ships.size})") }
            if (ui.ships.isEmpty()) {
                item {
                    Text(
                        "No ships yet. Connect your RSI account to import them.",
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            } else {
                items(ui.ships, key = { it.id }) { ShipRow(it) }
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(top = 8.dp),
    )
}

@Composable
private fun ProfileHeader(user: User?) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                user?.username ?: "Pilot",
                style = MaterialTheme.typography.titleLarge,
            )
            user?.email?.let {
                Text(it, style = MaterialTheme.typography.bodyMedium)
            }
            val connected = user?.isRsiConnected == true
            Text(
                if (connected) "RSI connected" else "RSI not connected",
                style = MaterialTheme.typography.labelMedium,
                color = if (connected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
            user?.rsiHandle?.let {
                Text("Handle: $it", style = MaterialTheme.typography.bodySmall)
            }
            user?.rsiOrganization?.let {
                Text("Org: $it", style = MaterialTheme.typography.bodySmall)
            }
            user?.lastRsiSync?.let {
                Text("Last sync: $it", style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun RsiCard(busy: Boolean, viewModel: DashboardViewModel) {
    var rsiHandle by rememberSaveable { mutableStateOf("") }
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text("RSI Account", style = MaterialTheme.typography.titleMedium)
            OutlinedTextField(
                value = rsiHandle,
                onValueChange = { rsiHandle = it },
                label = { Text("Public RSI handle") },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                "Enter only your public RSI citizen handle — never your RSI password.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { viewModel.connectRsi(rsiHandle) },
                    enabled = !busy && rsiHandle.isNotBlank(),
                    modifier = Modifier.weight(1f),
                ) { Text("Link") }
                OutlinedButton(
                    onClick = { viewModel.syncRsi() },
                    enabled = !busy,
                    modifier = Modifier.weight(1f),
                ) { Text("Sync") }
            }
            if (busy) {
                CircularProgressIndicator(modifier = Modifier.padding(top = 4.dp))
            }
        }
    }
}

@Composable
private fun ServerRow(server: ServerStatus) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(server.region, style = MaterialTheme.typography.titleSmall)
                Text(
                    server.status,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                server.players?.let { Text("$it players", style = MaterialTheme.typography.bodySmall) }
                server.latency?.let { Text("${it}ms", style = MaterialTheme.typography.bodySmall) }
            }
        }
    }
}

@Composable
private fun ShipRow(ship: Ship) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(ship.name, style = MaterialTheme.typography.titleSmall)
            Text(
                listOfNotNull(ship.manufacturer, ship.type).joinToString(" • "),
                style = MaterialTheme.typography.bodySmall,
            )
            val meta = listOfNotNull(
                ship.status?.let { "Status: $it" },
                ship.location?.let { "Loc: $it" },
            ).joinToString("   ")
            if (meta.isNotBlank()) {
                Text(meta, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}
