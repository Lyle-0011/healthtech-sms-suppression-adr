import assert from "node:assert/strict";
import { notifyAppointment } from "./appointment_notifications.ts";

const input = {
  appointmentId: "apt-42",
  patientPhone: "+15550101",
  patientName: "Sam",
  startsAt: "2030-04-12T09:30:00.000Z",
  reminderText: "Your appointment is tomorrow at 9:30 AM."
};

const suppressed = await notifyAppointment(input, { has: async () => true }, async () => {
  throw new Error("suppressed patients must never reach the sender");
});
assert.deepEqual(suppressed, {
  kind: "suppressed",
  appointmentId: "apt-42",
  reason: "patient_opted_out"
});

let calls = 0;
const sent = await notifyAppointment(input, { has: async () => false }, async (payload, requestId) => {
  calls += 1;
  assert.deepEqual(payload, {
    messages: [{ to: "+15550101", body: "Your appointment is tomorrow at 9:30 AM." }],
    idempotency_key: "appointment-apt-42"
  });
  assert.equal(requestId, "appointment-apt-42");
  return { message_id: "msg-42" };
});
assert.equal(sent.kind, "sent");
assert.equal(calls, 1);
console.log("suppression decision test passed");
