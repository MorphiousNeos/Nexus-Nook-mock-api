import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var auth: AuthViewModel
    @StateObject private var model = DashboardViewModel()

    @State private var showConnectSheet = false
    @State private var rsiEmail = ""

    var body: some View {
        NavigationStack {
            List {
                profileSection
                rsiSection
                serversSection
                shipsSection
            }
            .listStyle(.insetGrouped)
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Sign Out", role: .destructive) { auth.logout() }
                }
            }
            .refreshable { await model.load(auth: auth) }
            .overlay {
                if model.isLoading && model.profile == nil {
                    ProgressView()
                }
            }
            .task { await model.load(auth: auth) }
            .alert("RSI", isPresented: $model.showRSIResult) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(model.rsiResultMessage ?? "")
            }
            .sheet(isPresented: $showConnectSheet) { connectSheet }
        }
    }

    // MARK: - Sections

    private var profileSection: some View {
        Section {
            if let profile = model.profile {
                VStack(alignment: .leading, spacing: 6) {
                    Text(profile.username)
                        .font(.title2.bold())
                    Text(profile.email)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if profile.rsiConnected {
                        Label(profile.rsiHandle ?? "Connected", systemImage: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundStyle(.green)
                        if let org = profile.rsiOrganization {
                            Text("Org: \(org)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        Label("RSI not connected", systemImage: "xmark.seal")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            } else if let error = model.errorMessage {
                Text(error).foregroundStyle(.red)
            }
        }
    }

    private var rsiSection: some View {
        Section("RSI Account") {
            Button {
                showConnectSheet = true
            } label: {
                Label("Connect RSI Account", systemImage: "link")
            }
            Button {
                Task { await model.syncRSI(auth: auth) }
            } label: {
                Label("Sync RSI Data", systemImage: "arrow.triangle.2.circlepath")
            }
            .disabled(model.profile?.rsiConnected != true)
        }
    }

    private var serversSection: some View {
        Section("Server Status") {
            if model.servers.isEmpty {
                Text("No server data").foregroundStyle(.secondary)
            } else {
                ForEach(model.servers) { ServerStatusRow(server: $0) }
            }
        }
    }

    private var shipsSection: some View {
        Section("My Ships (\(model.ships.count))") {
            if model.ships.isEmpty {
                Text("No ships").foregroundStyle(.secondary)
            } else {
                ForEach(model.ships) { ShipRow(ship: $0) }
            }
        }
    }

    private var connectSheet: some View {
        NavigationStack {
            Form {
                Section("RSI Email") {
                    TextField("you@example.com", text: $rsiEmail)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                Section {
                    Text("This uses a mock RSI integration on the backend; any email returns a sample handle and imported ships.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Connect RSI")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { showConnectSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Connect") {
                        let email = rsiEmail
                        showConnectSheet = false
                        Task { await model.connectRSI(rsiEmail: email, auth: auth) }
                    }
                    .disabled(rsiEmail.isEmpty)
                }
            }
        }
    }
}
