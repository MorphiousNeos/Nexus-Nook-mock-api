import Foundation

/// Response for POST /api/auth/register and /api/auth/login.
struct AuthResponse: Codable {
    let success: Bool
    let token: String
    let user: User
}

/// Response for POST /api/rsi/connect.
struct RSIConnectResponse: Codable {
    let success: Bool
    let message: String
    let data: RSIConnectData

    struct RSIConnectData: Codable {
        let handle: String
        let organization: String
        let shipsImported: Int
    }
}

/// Response for POST /api/rsi/sync.
struct RSISyncResponse: Codable {
    let success: Bool
    let message: String
    let timestamp: String
}

/// Response for GET /health.
struct HealthResponse: Codable {
    let status: String
    let timestamp: String
    let service: String
}
