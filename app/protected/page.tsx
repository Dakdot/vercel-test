import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { InfoIcon, Gamepad2 } from "lucide-react";
import { FetchDataSteps } from "@/components/tutorial/fetch-data-steps";
import Link from "next/link";

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated
          user
        </div>
      </div>

      {/* Minecraft Game Link */}
      <div className="w-full">
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 size="24" className="text-green-500" />
            <h3 className="text-xl font-bold">Minecraft Clone</h3>
          </div>
          <p className="text-foreground/80 mb-4">
            Experience a browser-based Minecraft clone built with Three.js!
            Build, explore, and create in a 3D voxel world with procedurally
            generated terrain, trees, and multiple block types.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Link
              href="/protected/minecraft"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Gamepad2 size="18" />
              Play Minecraft Clone
            </Link>
            <div className="text-sm text-foreground/60">
              <p>Controls: WASD to move, mouse to look, click to build!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Your user details</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-32 overflow-auto">
          {JSON.stringify(data.claims, null, 2)}
        </pre>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4">Next steps</h2>
        <FetchDataSteps />
      </div>
    </div>
  );
}
