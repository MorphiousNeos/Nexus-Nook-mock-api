import Foundation

/// Lightweight user returned by auth endpoints.
struct User: Codable, Identifiable, Equatable {
    let id: Int
    let username: String
    let email: String
    let rsiConnected: Bool?

    enum CodingKeys: String, CodingKey {
        case id, username, email
        case rsiConnected
    }
}

/// Full profile returned by GET /api/user/profile (snake_case fields).
struct UserProfile: Codable, Identifiable, Equatable {
    let id: Int
    let username: String
    let email: String
    let rsiConnected: Bool
    let rsiHandle: String?
    let rsiOrganization: String?
    let lastRsiSync: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, username, email
        case rsiConnected = "rsi_connected"
        case rsiHandle = "rsi_handle"
        case rsiOrganization = "rsi_organization"
        case lastRsiSync = "last_rsi_sync"
        case createdAt = "created_at"
    }
}

struct ProfileResponse: Codable {
    let user: UserProfile
}
