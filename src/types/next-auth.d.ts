import type { DefaultSession } from "next-auth";

// Add the user id to the session type so `session.user.id` is typed.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
