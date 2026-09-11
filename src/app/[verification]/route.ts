type Context = {
  params: Promise<{ verification: string }>;
};

function verificationFile() {
  const file = process.env.GOOGLE_SITE_VERIFICATION_FILE?.trim();
  if (!file || !/^google[a-zA-Z0-9_-]+\.html$/.test(file)) return null;
  return file;
}

export async function GET(_request: Request, { params }: Context) {
  const { verification } = await params;
  const file = verificationFile();

  if (verification !== file) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const configuredContent = process.env.GOOGLE_SITE_VERIFICATION_CONTENT?.trim();
  const content = configuredContent || `google-site-verification: ${file}`;

  return new Response(`${content}\n`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
