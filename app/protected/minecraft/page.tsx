import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MinecraftGame from "@/components/minecraft/MinecraftGame";

export default async function MinecraftPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-50 bg-black/90 text-white p-3 rounded-lg text-sm border border-white/20">
        <h3 className="font-bold mb-1">🎮 Minecraft Clone</h3>
        <p className="text-xs opacity-75 mb-2">Press ESC to show cursor</p>
        <a
          href="/protected"
          className="text-blue-300 hover:text-blue-100 underline text-xs"
        >
          ← Back to Dashboard
        </a>
      </div>
      <MinecraftGame />
    </div>
  );
}
