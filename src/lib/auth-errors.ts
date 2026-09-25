// Better Auth reports failures with stable codes; the UI maps the ones a
// person can act on to translated messages and falls back to a generic one.
export function authErrorKey(code: string | undefined) {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_EMAIL":
      return "errorInvalidCredentials";
    case "PASSWORD_TOO_SHORT":
      return "errorPasswordTooShort";
    case "PASSWORD_TOO_LONG":
      return "errorPasswordTooLong";
    case "INVALID_PASSWORD":
      return "errorWrongCurrentPassword";
    default:
      return "errorGeneric";
  }
}
