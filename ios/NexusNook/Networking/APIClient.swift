import Foundation

/// Async/await URLSession client for the Nexus Nook backend.
final class APIClient {
    static let shared = APIClient()

    private let baseURL: URL
    private let session: URLSession
    private let tokenStore: TokenStore
    private let decoder: JSONDecoder

    init(baseURL: URL = Config.apiBaseURL,
         session: URLSession = .shared,
         tokenStore: TokenStore = .shared) {
        self.baseURL = baseURL
        self.session = session
        self.tokenStore = tokenStore
        self.decoder = JSONDecoder()
    }

    private enum Method: String {
        case get = "GET"
        case post = "POST"
    }

    // MARK: - Typed endpoints

    func register(username: String, email: String, password: String) async throws -> AuthResponse {
        try await request(
            "/api/auth/register",
            method: .post,
            body: ["username": username, "email": email, "password": password],
            authenticated: false
        )
    }

    func login(email: String, password: String) async throws -> AuthResponse {
        try await request(
            "/api/auth/login",
            method: .post,
            body: ["email": email, "password": password],
            authenticated: false
        )
    }

    func getProfile() async throws -> UserProfile {
        let response: ProfileResponse = try await request("/api/user/profile", method: .get)
        return response.user
    }

    func getShips() async throws -> [Ship] {
        let response: ShipsResponse = try await request("/api/ships", method: .get)
        return response.ships
    }

    func getServerStatus() async throws -> [ServerStatus] {
        let response: ServerStatusResponse = try await request(
            "/api/servers/status",
            method: .get,
            authenticated: false
        )
        return response.servers
    }

    /// Links a user's PUBLIC RSI handle. No credentials are sent — see docs/COMPLIANCE.md.
    func connectRSI(rsiHandle: String) async throws -> RSIConnectResponse {
        try await request(
            "/api/rsi/connect",
            method: .post,
            body: ["rsiHandle": rsiHandle]
        )
    }

    func syncRSI() async throws -> RSISyncResponse {
        try await request("/api/rsi/sync", method: .post, body: [:])
    }

    func health() async throws -> HealthResponse {
        try await request("/health", method: .get, authenticated: false)
    }

    // MARK: - Core request

    private func request<T: Decodable>(
        _ path: String,
        method: Method,
        body: [String: Any]? = nil,
        authenticated: Bool = true
    ) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }

        var req = URLRequest(url: url)
        req.httpMethod = method.rawValue
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body, method == .post {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
        }

        if authenticated, let token = tokenStore.token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(error.localizedDescription)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport("No HTTP response.")
        }

        switch http.statusCode {
        case 200...299:
            do {
                return try decoder.decode(T.self, from: data)
            } catch {
                throw APIError.decodingFailed
            }
        case 401:
            throw APIError.unauthorized
        default:
            throw APIError.requestFailed(status: http.statusCode, message: Self.errorMessage(from: data))
        }
    }

    private static func errorMessage(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        return (json["error"] as? String) ?? (json["message"] as? String)
    }
}
