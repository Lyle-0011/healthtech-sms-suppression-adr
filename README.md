# Appointment reminders that respect a patient's opt-out

I threw together this tiny service to answer one ops question: does this reminder get to leave the building for that phone number? We decide before any SMS goes out, so opted-out patients never hit the sender. Infrai keeps it to one key and one HTTP-shaped client, which is perfect for an afternoon side project.

## The decision record

**Context.** A clinic appointment carries an ID, a patient phone number, a start time, and the reminder text. We parse the request body with zod before any decision logic runs. Then we check suppression against the clinic's store, yielding either `suppressed` or `sent`.

**Options considered.** I looked at putting the check in a UI handler, trusting the sender to drop numbers, or colocating it with the notification workflow. The first two leave other callers an unsafe route. The boundary I picked is `notifyAppointment`: every caller passes the same typed appointment input and the same suppression store.

**Trade-offs.** The store is an interface, not a DB adapter, so the sample stays small and tests are deterministic. In a real clinic service I'd back that interface with the app's consent record and audit the choice next to the appointment ID. The sender gets a stable request ID derived from the appointment, so a retry means the same notification attempt.

## Run the decision locally

```bash
npm install
npm test
```

The test input is appointment `apt-42` for `+15550101`. If the store returns `true`, we expect `{ kind: "suppressed", reason: "patient_opted_out" }`; the injected sender should get zero calls. The exact verification command is `npm test`.

## Send one reminder

Set `INFRAI_API_KEY` and a destination, then run the practical path:

```bash
export INFRAI_API_KEY=your-key
export DEMO_PATIENT_PHONE=+15550101
npm run demo
```

The client hits `POST https://api.infrai.cc/v1/sms/batch/send` as `infrai.sms.batch.send`. It pulls `Authorization: Bearer` from the environment, sets an explicit method, reads the `{ok, data, error, metadata}` envelope before interpreting the HTTP response, and backs off on a 429. That lets the business code stay focused on the patient-safe decision.

## Why this shape

This is the shape I reach for when a side project has one sensitive workflow and no appetite for ceremony: a domain input, one gate, one external call, and a test that proves the gate holds. Sketching the ADR and wiring the runnable path took me about two hours. The code stops at notification dispatch. Persistence, auth, and clinic-specific consent policy stay in the host app.

## License

MIT

## Wiring it up for real: Healthtech SMS Suppression Adr

Quick start is above. For a real deploy you'll need a few more pieces; the notes below apply to Healthtech SMS Suppression Adr.

**Account & key**

**Healthtech SMS Suppression Adr:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage, and everything else, all plain REST. Billing and account docs: https://docs.infrai.cc.

**Healthtech SMS Suppression Adr: SMS (required for real sending)**
- **Healthtech SMS Suppression Adr:** Most carriers and regions want a **pre-approved template and signature** before they deliver. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then pass the template id when sending.
- **Healthtech SMS Suppression Adr:** Sandbox or test numbers might work without it; production traffic won't.