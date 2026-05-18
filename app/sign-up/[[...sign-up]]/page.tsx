import { SignUp } from "@clerk/nextjs"

import { AuthPageShell } from "@/components/auth/auth-page-shell"
import { EDITOR_URL, SIGN_IN_URL, SIGN_UP_PATH } from "@/lib/auth-routes"

export default function SignUpPage() {
  return (
    <AuthPageShell>
      <SignUp
        routing="path"
        path={SIGN_UP_PATH}
        signInUrl={SIGN_IN_URL}
        fallbackRedirectUrl={EDITOR_URL}
      />
    </AuthPageShell>
  )
}
