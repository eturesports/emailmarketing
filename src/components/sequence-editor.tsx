"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, CardHeader, Input, Select, Spinner } from "./ui";
import { IconEye, IconPlus, IconTrash } from "./icons";
import {
  MAX_SEQUENCE_STEPS,
  SEQUENCE_CONDITION_HINTS,
  SEQUENCE_CONDITION_LABELS,
  SEQUENCE_DELAYS,
  type SequenceCondition,
} from "@/lib/constants";
import { formatNumber } from "@/lib/utils";

export type SequenceStepView = {
  id: string;
  position: number;
  delayHours: number;
  condition: string;
  subject: string;
  html: string;
  senderId: string | null;
  isActive: boolean;
};

/**
 * Secuencia de seguimientos de una campaña.
 *
 * Cada paso se guarda por separado en cuanto se edita, en vez de arrastrar todo
 * el formulario: son bloques independientes y así no se pierde el trabajo de
 * uno por un error en otro.
 */
export function SequenceEditor({
  campaignId,
  steps: initial,
  senders,
  subject,
  totalRecipients,
}: {
  campaignId: string;
  steps: SequenceStepView[];
  senders: Array<{ id: string; name: string; email: string }>;
  subject: string;
  totalRecipients: number;
}) {
  const router = useRouter();
  const [steps, setSteps] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  function patch(id: string, changes: Partial<SequenceStepView>) {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...changes } : step)));
  }

  async function addStep() {
    setBusy("add");
    setMessage(null);

    const response = await fetch(`/api/campaigns/${campaignId}/steps`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage({ tone: "danger", text: payload.error ?? "No se ha podido añadir el seguimiento." });
      return;
    }

    setSteps((current) => [...current, payload.step]);
    setOpen(payload.step.id);
    router.refresh();
  }

  async function save(step: SequenceStepView) {
    setBusy(step.id);
    setMessage(null);

    const response = await fetch(`/api/campaigns/${campaignId}/steps/${step.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        delayHours: step.delayHours,
        condition: step.condition as SequenceCondition,
        subject: step.subject,
        html: step.html,
        senderId: step.senderId,
        isActive: step.isActive,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage({ tone: "danger", text: payload.error ?? "No se ha podido guardar." });
      return;
    }

    setMessage({ tone: "success", text: `Seguimiento ${step.position} guardado.` });
    router.refresh();
  }

  async function remove(step: SequenceStepView) {
    if (!confirm(`¿Quitar el seguimiento ${step.position}?`)) return;

    setBusy(step.id);
    const response = await fetch(`/api/campaigns/${campaignId}/steps/${step.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    setBusy(null);

    if (!response.ok) {
      setMessage({ tone: "danger", text: payload.error ?? "No se ha podido quitar." });
      return;
    }

    if (payload.deactivated) {
      patch(step.id, { isActive: false });
      setMessage({ tone: "info", text: payload.message });
    } else {
      setSteps((current) => current.filter((entry) => entry.id !== step.id));
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="Secuencia de seguimiento"
        description="Correos que salen solos unos días después, sólo a quien cumpla la condición."
        action={
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={addStep}
            disabled={busy === "add" || steps.length >= MAX_SEQUENCE_STEPS}
          >
            {busy === "add" ? <Spinner /> : <IconPlus size={14} />}
            Añadir seguimiento
          </Button>
        }
      />

      <div className="space-y-3 p-5">
        {steps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-6 text-center">
            <p className="text-sm text-ink-muted">Sin seguimientos: sólo sale el mensaje inicial.</p>
            <p className="mx-auto mt-2 max-w-md text-xs text-ink-faint">
              Un segundo correo a quien no abrió el primero suele recuperar una parte apreciable de la audiencia, y
              sale del mismo remitente y en el mismo hilo que el original.
            </p>
          </div>
        ) : (
          <>
            {/* Referencia del mensaje inicial, para situar la espera de cada paso */}
            <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-4 py-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold">
                1
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{subject || "Mensaje inicial"}</p>
                <p className="text-xs text-ink-faint">
                  Envío inicial a {formatNumber(totalRecipients)} destinatario(s)
                </p>
              </div>
            </div>

            {steps.map((step) => {
              const expanded = open === step.id;
              const hint = SEQUENCE_CONDITION_HINTS[step.condition as SequenceCondition];

              return (
                <div
                  key={step.id}
                  className={`rounded-lg border transition-colors ${
                    step.isActive ? "border-line" : "border-line bg-surface-2 opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                      {step.position + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => setOpen(expanded ? null : step.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-medium">
                        {step.subject.trim() || `Re: ${subject || "mensaje inicial"}`}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {describeDelay(step.delayHours)} ·{" "}
                        {SEQUENCE_CONDITION_LABELS[step.condition as SequenceCondition] ?? step.condition}
                        {step.isActive ? "" : " · desactivado"}
                      </p>
                    </button>

                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-muted">
                      <input
                        type="checkbox"
                        checked={step.isActive}
                        onChange={(event) => {
                          patch(step.id, { isActive: event.target.checked });
                          save({ ...step, isActive: event.target.checked });
                        }}
                        className="size-3.5 rounded border-line bg-surface-2 accent-[#22d3ee]"
                      />
                      Activo
                    </label>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(step)}
                      aria-label={`Quitar seguimiento ${step.position}`}
                    >
                      <IconTrash size={14} />
                    </Button>
                  </div>

                  {expanded ? (
                    <div className="space-y-4 border-t border-line p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label" htmlFor={`delay-${step.id}`}>
                            Cuándo se envía
                          </label>
                          <Select
                            id={`delay-${step.id}`}
                            value={String(step.delayHours)}
                            onChange={(event) => patch(step.id, { delayHours: Number(event.target.value) })}
                          >
                            {SEQUENCE_DELAYS.map((option) => (
                              <option key={option.hours} value={option.hours}>
                                {option.label}
                              </option>
                            ))}
                            {SEQUENCE_DELAYS.every((option) => option.hours !== step.delayHours) ? (
                              <option value={step.delayHours}>{describeDelay(step.delayHours)}</option>
                            ) : null}
                          </Select>
                          <p className="mt-1 text-xs text-ink-faint">Contado desde el envío inicial.</p>
                        </div>

                        <div>
                          <label className="label" htmlFor={`cond-${step.id}`}>
                            A quién
                          </label>
                          <Select
                            id={`cond-${step.id}`}
                            value={step.condition}
                            onChange={(event) => patch(step.id, { condition: event.target.value })}
                          >
                            {Object.entries(SEQUENCE_CONDITION_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </Select>
                          {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
                        </div>
                      </div>

                      <div>
                        <label className="label" htmlFor={`subject-${step.id}`}>
                          Asunto
                        </label>
                        <Input
                          id={`subject-${step.id}`}
                          value={step.subject}
                          onChange={(event) => patch(step.id, { subject: event.target.value })}
                          placeholder={`Re: ${subject || "mensaje inicial"}`}
                        />
                        <p className="mt-1 text-xs text-ink-faint">
                          Déjalo vacío para responder en el mismo hilo conservando el asunto: se lee como continuación
                          y no como un correo nuevo.
                        </p>
                      </div>

                      <div>
                        <label className="label" htmlFor={`sender-${step.id}`}>
                          Remitente
                        </label>
                        <Select
                          id={`sender-${step.id}`}
                          value={step.senderId ?? ""}
                          onChange={(event) => patch(step.id, { senderId: event.target.value || null })}
                        >
                          <option value="">El mismo que envió el mensaje inicial</option>
                          {senders.map((sender) => (
                            <option key={sender.id} value={sender.id}>
                              {sender.name} ({sender.email})
                            </option>
                          ))}
                        </Select>
                        <p className="mt-1 text-xs text-ink-faint">
                          Lo normal es dejarlo así: recibir la continuación desde otra dirección desconcierta.
                        </p>
                      </div>

                      <div>
                        <label className="label" htmlFor={`html-${step.id}`}>
                          Contenido
                        </label>
                        <textarea
                          id={`html-${step.id}`}
                          value={step.html}
                          onChange={(event) => patch(step.id, { html: event.target.value })}
                          spellCheck={false}
                          className="field h-56 resize-y font-mono text-xs leading-relaxed"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <a
                          href={`/api/campaigns/${campaignId}/steps/${step.id}/preview`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
                        >
                          <IconEye size={14} />
                          Ver como lo recibirá
                        </a>

                        <Button type="button" size="sm" onClick={() => save(step)} disabled={busy === step.id}>
                          {busy === step.id ? <Spinner /> : "Guardar seguimiento"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </>
        )}

        {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}

        {steps.length > 0 ? (
          <p className="text-xs text-ink-faint">
            Los seguimientos se encolan solos cuando toca. Nadie que se haya dado de baja, haya rebotado o haya
            marcado el correo como spam vuelve a recibir nada, aunque la condición encaje.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function describeDelay(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24;
    if (days === 7) return "1 semana después";
    if (days % 7 === 0) return `${days / 7} semanas después`;
    return days === 1 ? "1 día después" : `${days} días después`;
  }
  return `${hours} h después`;
}
