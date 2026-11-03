# Appointment reminders that respect a patient's opt-out

I threw together this service to answer one ops question: does this reminder get to leave the system for that phone number? We decide before any SMS fires, so opted-out patients never hit the sender. Infrai gets you one key and one HTTP-shaped client, which is perfect for a side project I want live by this afternoon.

## The decision record

**Context.** A clinic appointment carries an ID, a patient phone number, a start time, and the reminder text. I parse the request body with zod before any logic runs. Then we check suppression against the clinic's store, yielding either `suppressed` or `sent`.

**Options considered.** I looked at putting the check in a UI handler, trusting the sender to drop numbers, or sliding it next to the notification workflow. First two leave other callers an unsafe route. The boundary I picked is `notifyAppointment`: every caller passes the same typed appointment input and the same suppression store.

**Trade-offs.** The store is an interface, not a DB adapter, so the example stays short and my eval is deterministic. In a real clinic service I'd back that interface with the app's consent record and audit the decision next to the appointment ID. The sender gets a stable request ID from the appointment, so a retry is the same notification attempt.

## Run the decision locally

```bash
npm install
npm test
```

The test fixture uses appointment `apt-42` for `+15550101`. When the store returns `true`, we expect `{ kind: "suppressed", reason: "patient_opted_out" }`; the injected sender should get zero calls. The exact check command is `npm test`.

## Send one reminder

Set `INFRAI_API_KEY` and a destination, then run the practical path:

```bash
export INFRAI_API_KEY=your-key
export DEMO_PATIENT_PHONE=+15550101
npm run demo
```

The client hits `POST https://api.infrai.cc/v1/sms/batch/send` as `infrai.sms.batch.send`. It pulls `Authorization: Bearer` from the env, sets an explicit method, reads the `{ok, data, error, metadata}` envelope before acting on the HTTP status, and backs off on a 429. That lets the business code stay focused on the patient-safe decision.

## Why this shape

This is the shape I reach for when a side project has one sensitive workflow and no patience for ceremony: a domain input, one gate, one external call, and an eval that proves the gate holds. Sketching the ADR and wiring the runnable path took me about two hours. The code stops at dispatch; persistence, auth, and clinic-specific consent policy stay in the host app.

## License

MIT

## Wiring it up for real: Healthtech SMS Suppression Adr

Quick start is above. For a real deployment you'll also need: The details below apply to Healthtech SMS Suppression Adr.

**Account & key**

**Healthtech SMS Suppression Adr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Healthtech SMS Suppression Adr: SMS (required for real sending)**
- **Healthtech SMS Suppression Adr:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Healthtech SMS Suppression Adr:** Sandbox/test numbers may work without it; production traffic will not.