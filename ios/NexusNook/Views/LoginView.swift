import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var auth: AuthViewModel

    @State private var isRegistering = false
    @State private var username = ""
    @State private var email = ""
    @State private var password = ""

    private var canSubmit: Bool {
        guard !email.isEmpty, !password.isEmpty else { return false }
        if isRegistering { return !username.isEmpty }
        return true
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    header

                    VStack(spacing: 12) {
                        if isRegistering {
                            field("Username", text: $username)
                                .textContentType(.username)
                                .autocorrectionDisabled()
                        }
                        field("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        SecureField("Password", text: $password)
                            .textContentType(isRegistering ? .newPassword : .password)
                            .textFieldStyle(.roundedBorder)
                    }

                    if let error = auth.errorMessage {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Button(action: submit) {
                        if auth.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text(isRegistering ? "Create Account" : "Sign In")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .disabled(!canSubmit || auth.isLoading)

                    Button(isRegistering ? "Have an account? Sign in" : "Need an account? Register") {
                        withAnimation { isRegistering.toggle() }
                    }
                    .font(.footnote)
                }
                .padding(24)
            }
            .navigationTitle(isRegistering ? "Register" : "Sign In")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var header: some View {
        VStack(spacing: 6) {
            Image(systemName: "shippingbox.fill")
                .font(.system(size: 48))
                .foregroundStyle(.tint)
            Text("Nexus Nook")
                .font(.largeTitle.bold())
            Text("Your Star Citizen companion")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.bottom, 8)
    }

    private func field(_ title: String, text: Binding<String>) -> some View {
        TextField(title, text: text)
            .textFieldStyle(.roundedBorder)
    }

    private func submit() {
        Task {
            if isRegistering {
                await auth.register(username: username, email: email, password: password)
            } else {
                await auth.login(email: email, password: password)
            }
        }
    }
}
