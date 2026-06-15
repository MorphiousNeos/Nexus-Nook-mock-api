import Foundation

enum Config {
    /// API base URL. Reads `APIBaseURL` from Info.plist, falling back to localhost dev default.
    static let apiBaseURL: URL = {
        if let raw = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
           !raw.isEmpty,
           let url = URL(string: raw) {
            return url
        }
        return URL(string: "http://localhost:3001")!
    }()
}
