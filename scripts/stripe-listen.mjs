import { spawn } from "node:child_process";
if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
  console.error(
    "Set a Stripe test key in .env.local before running the local listener.",
  );
  process.exit(1);
}
const origin = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000")
  .origin;
const child = spawn(
  "stripe",
  [
    "listen",
    "--skip-update",
    "--events",
    "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired",
    "--forward-to",
    `${origin}/api/payments/webhook`,
  ],
  {
    env: { ...process.env, STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY },
    stdio: ["inherit", "pipe", "pipe"],
  },
);
console.log(`Forwarding Stripe test events to ${origin}/api/payments/webhook`);
function forward(stream) {
  let pending = "";
  stream.on("data", (data) => {
    pending += data.toString();
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines)
      console.log(
        line.replace(/whsec_[a-zA-Z0-9]+/g, "[signing secret hidden]"),
      );
  });
  stream.on("end", () => {
    if (pending)
      console.log(
        pending.replace(/whsec_[a-zA-Z0-9]+/g, "[signing secret hidden]"),
      );
  });
}
forward(child.stdout);
forward(child.stderr);
child.on("error", () => {
  console.error(
    "Stripe CLI could not start. Install the official Stripe CLI first.",
  );
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
