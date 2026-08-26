export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const backendUrl = env.BACKEND_URL || env.NEXT_PUBLIC_API_URL || "https://nurofin-ai-backend.onrender.com";
  const targetUrl = `${backendUrl}${url.pathname}${url.search}`;

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() !== "host") {
      headers.set(key, value);
    }
  }

  const modifiedRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: "follow",
  });

  try {
    return await fetch(modifiedRequest);
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: "Backend service unavailable" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
