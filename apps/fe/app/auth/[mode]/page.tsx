import { redirect } from "next/navigation";
import { AuthForm } from "./AuthForm";

const VALID_MODES = ["signin", "signup"] as const;

const Auth = async ({ params }: { params: Promise<{ mode: string }> }) => {
  const { mode } = await params;
  const normalized = mode?.toLowerCase();

  if (!normalized || !VALID_MODES.includes(normalized as (typeof VALID_MODES)[number])) {
    redirect("/auth/signin");
  }

  return <AuthForm mode={normalized as "signin" | "signup"} />;
};

export default Auth;
