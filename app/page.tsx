import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { EDITOR_URL, SIGN_IN_URL } from "@/lib/auth-routes";

export default async function Home() {
  const { isAuthenticated } = await auth();

  redirect(isAuthenticated ? EDITOR_URL : SIGN_IN_URL);
}
