const EVOLUTION_URL = process.env.EVOLUTION_API_URL!;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY!;
const INSTANCE = process.env.EVOLUTION_INSTANCE!;

export async function sendWhatsAppMessage(
  phone: string,
  text: string
): Promise<void> {
  await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: EVOLUTION_KEY,
    },
    body: JSON.stringify({ number: phone, text }),
  });
}

export async function downloadMedia(
  messageId: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const res = await fetch(
      `${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${INSTANCE}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_KEY,
        },
        body: JSON.stringify({ message: { key: { id: messageId } } }),
      }
    );
    const data = await res.json();
    console.log("[downloadMedia] status:", res.status, "keys:", Object.keys(data));
    if (!data.base64) {
      console.log("[downloadMedia] no base64 in response:", JSON.stringify(data).slice(0, 200));
      return null;
    }
    return {
      buffer: Buffer.from(data.base64, "base64"),
      mimeType: data.mimetype ?? "image/jpeg",
    };
  } catch (err) {
    console.error("[downloadMedia] error:", err);
    return null;
  }
}
