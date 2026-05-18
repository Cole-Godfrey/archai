import { SignIn } from "@clerk/nextjs"

import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { EDITOR_URL, SIGN_IN_PATH, SIGN_UP_URL } from "@/lib/auth-routes"

export default function SignInPage() {
  return (
    <AuthPageShell>
      <SignIn
        routing="path"
        path={SIGN_IN_PATH}
        signUpUrl={SIGN_UP_URL}
        fallbackRedirectUrl={EDITOR_URL}
      />
    </AuthPageShell>
  )
}
