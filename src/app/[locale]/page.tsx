import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/session";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const [user, { locale }] = await Promise.all([getCurrentUser(), params]);
  redirect({ href: user ? "/dashboard" : "/login", locale });
}
