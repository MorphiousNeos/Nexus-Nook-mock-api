import Foundation
import Security

/// Stores the JWT in the iOS Keychain.
///
/// Minimal wrapper: a single generic-password item keyed by account+service.
/// Enough for a single-user companion app; not a full-featured Keychain library.
final class TokenStore {
    static let shared = TokenStore()

    private let service = "com.nexusnook.companion.auth"
    private let account = "jwt"

    private init() {}

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }

    var token: String? { load() }

    func save(_ token: String) {
        guard let data = token.data(using: .utf8) else { return }
        // Delete any existing item first to keep this idempotent.
        SecItemDelete(baseQuery as CFDictionary)
        var query = baseQuery
        query[kSecValueData as String] = data
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(query as CFDictionary, nil)
    }

    func load() -> String? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess,
              let data = result as? Data,
              let token = String(data: data, encoding: .utf8) else {
            return nil
        }
        return token
    }

    func delete() {
        SecItemDelete(baseQuery as CFDictionary)
    }
}
