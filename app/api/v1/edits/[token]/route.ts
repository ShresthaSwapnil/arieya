import { jsonError, readJson } from "@/lib/http";
import { deleteEdit } from "@/lib/store";

export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const body = (await readJson(request, 2_000)) as Record<string, unknown>;
    if (typeof body.managementToken !== "string" || !(await deleteEdit(token, body.managementToken))) {
      return jsonError("Edit not found", 404);
    }
    return new Response(null, { status: 204 });
  } catch {
    return jsonError("Invalid request", 400);
  }
}
