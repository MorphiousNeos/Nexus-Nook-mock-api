import SwiftUI

struct ShipRow: View {
    let ship: Ship

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(ship.name)
                    .font(.headline)
                Spacer()
                if let status = ship.status {
                    Text(status.capitalized)
                        .font(.caption2)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(.quaternary, in: Capsule())
                }
            }

            Text("\(ship.manufacturer) · \(ship.type)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack(spacing: 12) {
                if let crew = ship.crew {
                    Label("\(crew)", systemImage: "person.2")
                }
                if let cargo = ship.cargo {
                    Label("\(cargo) SCU", systemImage: "shippingbox")
                }
                if let location = ship.location {
                    Label(location, systemImage: "location")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
