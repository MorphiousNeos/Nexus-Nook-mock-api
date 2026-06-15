import Foundation

struct Ship: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let manufacturer: String
    let type: String
    let cargo: Int?
    let crew: Int?
    let speed: Int?
    let price: Double?
    let pledge: String?
    let status: String?
    let location: String?
    let insurance: String?
}

struct ShipsResponse: Codable {
    let ships: [Ship]
}
