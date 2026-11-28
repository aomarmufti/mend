import { CONTACT_EMAIL } from "@/lib/site";

/**
 * The confirmation email sent when someone joins the waitlist. Plain text and a
 * simple HTML version. It contains nothing about the recipient, so there is
 * nothing to escape, and it says how to stop hearing from us.
 */
export function waitlistEmail(): { subject: string; text: string; html: string } {
  const subject = "You're on the Reknit waitlist";
  const lines = [
    "Thanks for joining the Reknit waitlist.",
    "",
    "Reknit gives you physio-led exercise plans with a camera coach that checks your form. We're getting it ready now.",
    "",
    "What happens next: we'll email you when it's ready, and we may invite you to try an early version and tell us what you think. That's all we'll use your email for.",
    "",
    `If you'd rather not hear from us, reply to this email or write to ${CONTACT_EMAIL} and we'll remove you.`,
    "",
    "Reknit supports general exercise and is not a medical device or a substitute for medical advice.",
  ];
  const text = lines.join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#0E2A26;padding:24px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#ffffff">
<div style="max-width:480px;margin:0 auto">
<p style="font-size:22px;font-weight:800;margin:0 0 16px">Reknit</p>
<h1 style="font-size:26px;line-height:1.15;margin:0 0 16px">You're on the waitlist.</h1>
<p style="font-size:16px;line-height:1.5;margin:0 0 14px;color:#dfeee9">Reknit gives you physio-led exercise plans with a camera coach that checks your form. We're getting it ready now.</p>
<p style="font-size:16px;line-height:1.5;margin:0 0 14px;color:#dfeee9"><strong style="color:#34D3A0">What happens next:</strong> we'll email you when it's ready, and we may invite you to try an early version and tell us what you think. That's all we'll use your email for.</p>
<p style="font-size:14px;line-height:1.5;margin:0 0 14px;color:#a9c4bc">If you'd rather not hear from us, reply to this email or write to <a href="mailto:${CONTACT_EMAIL}" style="color:#34D3A0">${CONTACT_EMAIL}</a> and we'll remove you.</p>
<p style="font-size:12px;line-height:1.5;margin:24px 0 0;color:#7f9c93">Reknit supports general exercise and is not a medical device or a substitute for medical advice.</p>
</div></body></html>`;
  return { subject, text, html };
}
