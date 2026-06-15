import Foundation
import Combine

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published private(set) var profile: UserProfile?
    @Published private(set) var ships: [Ship] = []
    @Published private(set) var servers: [ServerStatus] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    @Published var rsiResultMessage: String?
    @Published var showRSIResult = false

    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    /// Loads all dashboard data. On a 401, asks AuthViewModel to log out.
    func load(auth: AuthViewModel) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            async let profile = api.getProfile()
            async let ships = api.getShips()
            async let servers = api.getServerStatus()
            self.profile = try await profile
            self.ships = try await ships
            self.servers = try await servers
        } catch APIError.unauthorized {
            auth.handleUnauthorized()
        } catch {
            errorMessage = (error as? APIError)?.localizedDescription ?? error.localizedDescription
        }
    }

    func connectRSI(rsiEmail: String, auth: AuthViewModel) async {
        do {
            let response = try await api.connectRSI(rsiEmail: rsiEmail)
            rsiResultMessage = "\(response.message)\nHandle: \(response.data.handle)\nOrg: \(response.data.organization)\nShips imported: \(response.data.shipsImported)"
            showRSIResult = true
            await load(auth: auth)
        } catch APIError.unauthorized {
            auth.handleUnauthorized()
        } catch {
            rsiResultMessage = (error as? APIError)?.localizedDescription ?? error.localizedDescription
            showRSIResult = true
        }
    }

    func syncRSI(auth: AuthViewModel) async {
        do {
            let response = try await api.syncRSI()
            rsiResultMessage = "\(response.message)\nSynced at: \(response.timestamp)"
            showRSIResult = true
            await load(auth: auth)
        } catch APIError.unauthorized {
            auth.handleUnauthorized()
        } catch {
            rsiResultMessage = (error as? APIError)?.localizedDescription ?? error.localizedDescription
            showRSIResult = true
        }
    }
}
