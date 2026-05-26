const MAX_FIELD_LENGTH = 700;

function cleanField(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}

function escapeHtml(value) {
  return cleanField(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });
}

function parseBody(request) {
  if (!request.body) return {};
  if (typeof request.body === "object") return request.body;

  const contentType = String(request.headers["content-type"] || "");

  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(request.body));
  }

  if (typeof request.body === "string") {
    return JSON.parse(request.body || "{}");
  }

  return {};
}

function isAllowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return true;

  const host = request.headers.host;
  const allowedOrigin = process.env.FORM_ALLOWED_ORIGIN;
  const allowedOrigins = new Set([
    host ? `https://${host}` : "",
    allowedOrigin || "",
  ]);

  return allowedOrigins.has(origin);
}

function buildMessage(payload, request) {
  const product = escapeHtml(payload.product);
  const source = escapeHtml(payload.source || "не указано");
  const contact = escapeHtml(payload.contact);
  const page = escapeHtml(payload.page || request.headers.referer || "не указано");
  const submittedAt = new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Novosibirsk",
  }).format(new Date());

  return [
    "<b>Новая заявка Lead Lab</b>",
    "",
    `<b>Ниша / продукт:</b> ${product}`,
    `<b>Где искать аудиторию:</b> ${source}`,
    `<b>Контакт:</b> ${contact}`,
    "",
    `<b>Страница:</b> ${page}`,
    `<b>Время:</b> ${escapeHtml(submittedAt)} НСК`,
  ].join("\n");
}

module.exports = async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({
      ok: false,
      message: "Метод не поддерживается.",
    });
  }

  if (!isAllowedOrigin(request)) {
    return response.status(403).json({
      ok: false,
      message: "Запрос заблокирован.",
    });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return response.status(500).json({
      ok: false,
      message: "Форма временно не настроена.",
    });
  }

  let payload;

  try {
    payload = parseBody(request);
  } catch (error) {
    return response.status(400).json({
      ok: false,
      message: "Не удалось прочитать заявку.",
    });
  }

  if (cleanField(payload.website)) {
    return response.status(200).json({
      ok: true,
      message: "Заявка отправлена.",
    });
  }

  const product = cleanField(payload.product);
  const contact = cleanField(payload.contact);

  if (product.length < 2 || contact.length < 3) {
    return response.status(400).json({
      ok: false,
      message: "Заполните нишу и контакт для связи.",
    });
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildMessage(payload, request),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const telegramResult = await telegramResponse.json().catch(() => ({}));

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error("Telegram sendMessage failed", {
        status: telegramResponse.status,
        description: telegramResult.description || "unknown",
      });

      return response.status(502).json({
        ok: false,
        message: "Telegram временно не принял заявку.",
      });
    }

    return response.status(200).json({
      ok: true,
      message: "Заявка отправлена. Мы свяжемся с вами.",
    });
  } catch (error) {
    console.error("Lead form request failed", error);

    return response.status(502).json({
      ok: false,
      message: "Не удалось отправить заявку.",
    });
  }
};
