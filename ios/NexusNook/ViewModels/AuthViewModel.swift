import Foundation
import Combine

@MainActor
final class AuthViewModel: ObservableObject {
    @Published private(set) var isAuthenticated: Bool
    @Published private(set) var currentUser: User?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let api: APIClient
    private let tokenStore: TokenStore

    init(api: APIClient = .shared, tokenStore: TokenStore = .shared) {
        self.api = api
        self.tokenStore = tokenStore
        // If a token already exists, optimistically treat the user as signed in.
        // DashboardViewModel verifies via getProfile and calls handleUnauthorized on 401.
        self.isAuthenticated = tokenStore.token != nil
    }

    func login(email: String, password: String) async {
        await perform { try await self.api.login(email: email, password: password) }
    }

    func register(username: String, email: String, password: String) async {
        await perform { try await self.api.register(username: username, email: email, password: password) }
    }

    func logout() {
        tokenStore.delete()
        currentUser = nil
        isAuthenticated = false
    }

    /// Called when an authenticated request returns 401.
    func handleUnauthorized() {
        logout()
        errorMessage = APIError.unauthorized.localizedDescription
    }

    private func perform(_ operation: @escaping () async throws -> AuthResponse) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await operation()
            tokenStore.save(response.token)
            currentUser = response.user
            isAuthenticated = true
        } catch {
            errorMessage = (error as? APIError)?.localizedDescription ?? error.localizedDescription
        }
    }
}
