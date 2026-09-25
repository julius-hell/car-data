# Email and password sign-in, SSO later

Supersedes the passkey-only sign-in of the personal mileage tracker.

Fleet members sign in with email and password (Better Auth's email-and-password). Businesses expect accounts tied to a work email, admins need to be able to reset a driver's access within minutes, and drivers share devices or switch phones often — passkeys made all of that harder.

Email sending is optional per deployment. Without SMTP, admins (and the operator, for an organization's admins) hand out copyable invitation and one-time password-reset links. With SMTP, invitations, password resets, email verification and the weekly digest are emailed.

Single sign-on (OIDC/SAML) is likely to be requested later. To keep that possible, identity (user), credentials (account) and membership stay separate, and nothing in the domain may assume that a user has a password. SSO can then be added as a further credential type (for example Better Auth's SSO plugin, mapping email domains to organizations) without touching membership.
