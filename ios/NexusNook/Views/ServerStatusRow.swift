import SwiftUI

struct ServerStatusRow: View {
    let server: ServerStatus

    private var statusColor: Color {
        switch server.status.lowercased() {
        case "online", "operational", "healthy": return .green
        case "degraded", "warning", "maintenance": return .orange
        default: return .red
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(statusColor)
                .frame(width: 10, height: 10)

            VStack(alignment: .leading, spacing: 2) {
                Text(server.region)
                    .font(.headline)
                Text(server.status.capitalized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                if let players = server.players {
                    Text("\(players) players")
                        .font(.caption)
                }
                if let latency = server.latency {
                    Text("\(latency) ms")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}
