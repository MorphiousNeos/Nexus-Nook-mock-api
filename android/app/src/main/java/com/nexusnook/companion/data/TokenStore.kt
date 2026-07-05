package com.nexusnook.companion.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "nexus_auth")

/**
 * Persists the JWT in DataStore (Preferences). DataStore chosen over
 * EncryptedSharedPreferences to keep deps light and APIs coroutine-first; swap in
 * androidx.security if hardware-backed encryption becomes a requirement.
 */
class TokenStore(private val context: Context) {

    private val tokenKey = stringPreferencesKey("jwt")

    val tokenFlow: Flow<String?> = context.dataStore.data.map { it[tokenKey] }

    suspend fun currentToken(): String? = tokenFlow.first()

    suspend fun saveToken(token: String) {
        context.dataStore.edit { it[tokenKey] = token }
    }

    suspend fun clear() {
        context.dataStore.edit { it.remove(tokenKey) }
    }
}
