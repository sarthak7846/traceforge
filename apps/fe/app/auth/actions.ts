"use server";

import axios from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function signInAction(_: any, formData: FormData) {
  try {
    const email = formData.get("email");
    const password = formData.get("password");

    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/login`,
      {
        email,
        password,
      },
      {
        withCredentials: true,
      }
    );
    const token = res.data.access_token;
    if (token) {
      const cookieStore = await cookies();
      cookieStore.set("token", token);
    }
  } catch (error: any) {
    console.log(error);
    return {
      message: "Something went wrong",
    };
  }

  redirect("/dashboard");
}

export async function getAccessToken() {
  return (await cookies()).get("token")?.value || null;
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("token");
  redirect("/auth/signin");
}
