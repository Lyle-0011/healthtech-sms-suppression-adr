import { z } from "zod";
import { infrai } from "./infrai_sms.ts";

export const appointmentRequest = z.object({
  appointmentId: z.string().min(1),
  patientPhone: z.string().min(7),
  patientName: z.string().min(1),
  startsAt: z.string().datetime(),
  reminderText: z.string().min(1)
});

export type AppointmentRequest = z.infer<typeof appointmentRequest>;

export type SuppressionStore = {
  has(phone: string): Promise<boolean>;
};

export type NotificationDecision =
  | { kind: "suppressed"; appointmentId: string; reason: "patient_opted_out" }
  | { kind: "sent"; appointmentId: string; data: unknown };

export async function notifyAppointment(
  input: unknown,
  store: SuppressionStore,
  send = infrai.sms.batch.send
): Promise<NotificationDecision> {
  const request = appointmentRequest.parse(input);
  if (await store.has(request.patientPhone)) {
    return { kind: "suppressed", appointmentId: request.appointmentId, reason: "patient_opted_out" };
  }

  const data = await send(
    {
      messages: [{ to: request.patientPhone, body: request.reminderText }],
      idempotency_key: `appointment-${request.appointmentId}`
    },
    `appointment-${request.appointmentId}`
  );
  return { kind: "sent", appointmentId: request.appointmentId, data };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const phone = process.env.DEMO_PATIENT_PHONE;
  if (!phone) throw new Error("DEMO_PATIENT_PHONE is required");
  const result = await notifyAppointment(
    {
      appointmentId: "apt-demo-001",
      patientPhone: phone,
      patientName: "Jordan",
      startsAt: "2030-04-12T09:30:00.000Z",
      reminderText: "Reminder: your clinic appointment is tomorrow at 9:30 AM."
    },
    { has: async () => false }
  );
  console.log(result);
}
