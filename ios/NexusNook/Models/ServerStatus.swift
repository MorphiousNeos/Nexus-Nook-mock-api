import Foundation

struct ServerStatus: Codable, Identifiable, Equatable {
    let region: String
    let status: String
    let players: Int?
    let latency: Int?
    let capacity: Int?

    var id: String { region }
}

struct ServerStatusResponse: Codable {
    let servers: [ServerStatus]
}
