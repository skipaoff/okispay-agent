// Проверка логина и ключа магазина WayForPay для агента «Оплата».
// Запуск: node wayforpay-proverka.mjs <логин> <ключ>
// Спрашивает у WayForPay статус заказа, которого нет. Логин и ключ верные — WayForPay отвечает «заказ не найден»
// (код 1127); неверные — «неверная подпись» (1113) или «магазин не найден». Ключ никуда, кроме подписи запроса, не
// уходит и на экран не выводится.
// Вывод одной строкой: «принято» | «не принято: <код> <причина>» | «нет связи».
import { createHmac } from "node:crypto";

const say = (text) => process.stdout.write(`${text}\n`);

const [account = "", secret = ""] = process.argv.slice(2).map((value) => value.trim());
const LOGIN = /^[A-Za-z0-9_.-]{2,100}$/;
const KEY = /^[\x21-\x7E]{16,128}$/;

if (!LOGIN.test(account) || !KEY.test(secret)) {
  say("не похоже на логин и ключ — скопируй заново");
  process.exit(2);
}

const reference = `PROBE-${Date.now()}`;
const signature = createHmac("md5", secret).update(`${account};${reference}`, "utf8").digest("hex");

try {
  const response = await fetch("https://api.wayforpay.com/api", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transactionType: "CHECK_STATUS",
      merchantAccount: account,
      orderReference: reference,
      merchantSignature: signature,
      apiVersion: 1,
    }),
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const answer = await response.json();
  if (Number(answer.reasonCode) === 1127) say("принято");
  else say(`не принято: ${answer.reasonCode ?? response.status} ${answer.reason ?? ""}`.trim());
} catch {
  say("нет связи");
}
