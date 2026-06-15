import Foundation

enum APIError: Error, LocalizedError, Equatable {
    case invalidURL
    case requestFailed(status: Int, message: String?)
    case unauthorized
    case decodingFailed
    case transport(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL."
        case .requestFailed(let status, let message):
            return message ?? "Request failed (HTTP \(status))."
        case .unauthorized:
            return "Your session expired. Please sign in again."
        case .decodingFailed:
            return "Could not read the server response."
        case .transport(let message):
            return message
        }
    }
}
