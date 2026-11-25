"use client";

import { useActionState, useState } from "react";
import { clsx } from "clsx";
import { Field, Label, Notice, buttonClass, inputClass } from "@/components/ui";
import { CATEGORIES, LANGUAGES, slugify } from "@/lib/podcast-meta";
import type { ShowFormState } from "./actions";

export type ShowValues = {
  title: string;
  description: string;
  author: string;
  owner_email: string;
  language: string;
  category: string;
  subcategory: string;
  explicit: boolean;
  format: "audio" | "video";
  show_type: "episodic" | "serial";
  website_url: string;
  feed_slug: string;
};

const blank: ShowValues = {
  title: "",
  description: "",
  author: "",
  owner_email: "",
  language: "en",
  category: "",
  subcategory: "",
  explicit: false,
  format: "audio",
  show_type: "episodic",
  website_url: "",
  feed_slug: "",
};

const selectClass = clsx(inputClass, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%235A6478%22 stroke-width=%222%22 fill=%22none%22/></svg>')] bg-[right_16px_center] bg-no-repeat pr-10");

function Choice({
  name,
  value,
  checked,
  onChange,
  title,
  hint,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
}) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer gap-3 rounded-xl border-[1.5px] p-4 transition-colors has-focus-visible:outline-3 has-focus-visible:outline-focus",
        checked ? "border-ink bg-canvas/60" : "border-line-strong hover:border-muted",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="mt-1 size-4 accent-ink" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
}

export function ShowForm({
  action,
  initial,
  mode,
  feedHost,
  slugLocked = false,
}: {
  action: (prev: ShowFormState, form: FormData) => Promise<ShowFormState>;
  initial?: Partial<ShowValues>;
  mode: "create" | "edit";
  feedHost: string;
  slugLocked?: boolean;
}) {
  const start = { ...blank, ...initial };
  const [state, formAction, pending] = useActionState(action, {});
  const [category, setCategory] = useState(start.category);
  const [format, setFormat] = useState(start.format);
  const [showType, setShowType] = useState(start.show_type);
  const [explicit, setExplicit] = useState(start.explicit);
  const [title, setTitle] = useState(start.title);
  const [slug, setSlug] = useState(start.feed_slug);
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const fe = state.fieldErrors ?? {};
  const shownSlug = slugTouched ? slug : slugify(title || "your-show");

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.saved && <Notice tone="success">Saved.</Notice>}

      <section className="space-y-5">
        <h2 className="text-[20px] font-bold tracking-[-0.015em]">The basics</h2>
        <Field
          id="title"
          label="Show name"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={fe.title}
        />
        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={5}
            maxLength={4000}
            defaultValue={start.description}
            className={clsx(inputClass, "h-auto py-3 leading-relaxed")}
            aria-describedby="description-hint"
          />
          <p id="description-hint" className="mt-1.5 text-sm text-muted">
            What your show is about. Podcast apps show this on your show's page.
          </p>
          {fe.description && <p className="mt-1.5 text-sm text-danger">{fe.description}</p>}
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="author" label="Host or author" defaultValue={start.author} maxLength={200} hint="Shown as the creator in podcast apps." error={fe.author} />
          <Field
            id="owner_email"
            label="Contact email"
            type="email"
            defaultValue={start.owner_email}
            hint="Apple and Spotify use it to confirm you own the show."
            error={fe.owner_email}
          />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-[20px] font-bold tracking-[-0.015em]">How it's listed</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
              aria-invalid={fe.category ? true : undefined}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {Object.keys(CATEGORIES).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {fe.category && <p className="mt-1.5 text-sm text-danger">{fe.category}</p>}
          </div>
          <div>
            <Label htmlFor="subcategory">Subcategory (optional)</Label>
            <select
              id="subcategory"
              name="subcategory"
              key={category}
              defaultValue={category === start.category ? start.subcategory : ""}
              disabled={!CATEGORIES[category]?.length}
              className={selectClass}
            >
              <option value="">None</option>
              {(CATEGORIES[category] ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {fe.subcategory && <p className="mt-1.5 text-sm text-danger">{fe.subcategory}</p>}
          </div>
          <div>
            <Label htmlFor="language">Language</Label>
            <select id="language" name="language" defaultValue={start.language.split("-")[0]} className={selectClass}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <Field
            id="website_url"
            label="Website (optional)"
            type="url"
            defaultValue={start.website_url}
            placeholder="https://"
            error={fe.website_url}
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-[15px] font-semibold">Format</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <Choice name="format" value="audio" checked={format === "audio"} onChange={() => setFormat("audio")} title="Audio" hint="Podcast apps play the audio." />
            <Choice name="format" value="video" checked={format === "video"} onChange={() => setFormat("video")} title="Video" hint="Also goes to YouTube and video podcast apps." />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-[15px] font-semibold">Episode order</legend>
          <div className="grid gap-3 md:grid-cols-2">
            <Choice name="show_type" value="episodic" checked={showType === "episodic"} onChange={() => setShowType("episodic")} title="Newest first" hint="Most shows. Listeners can start anywhere." />
            <Choice name="show_type" value="serial" checked={showType === "serial"} onChange={() => setShowType("serial")} title="Oldest first" hint="For stories meant to be heard in order." />
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={explicit}
            onChange={(e) => setExplicit(e.target.checked)}
            className="mt-1 size-4 accent-ink"
          />
          <input type="hidden" name="explicit" value={explicit ? "yes" : "no"} />
          <span>
            <span className="block font-semibold">Contains explicit content</span>
            <span className="block text-sm text-muted">Strong language or adult themes. Apps label the show "E".</span>
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-[20px] font-bold tracking-[-0.015em]">Feed address</h2>
        <p className="text-[15px] text-slate">
          Where podcast apps will find your show. It can't change once your show is live on Ospod.
        </p>
        <div className="flex max-w-xl items-stretch overflow-hidden rounded-xl border-[1.5px] border-line-strong bg-white focus-within:border-ink">
          <span className="flex items-center bg-canvas px-3 text-[15px] whitespace-nowrap text-muted">{feedHost}/</span>
          <input
            id="feed_slug"
            name="feed_slug"
            aria-label="Feed address"
            value={shownSlug}
            disabled={slugLocked}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            maxLength={60}
            className="h-12 min-w-0 flex-1 px-3 text-base outline-none disabled:bg-canvas disabled:text-muted"
          />
        </div>
        {slugLocked && <p className="text-sm text-muted">This show is live, so its feed address is fixed.</p>}
        {fe.feed_slug && <p className="text-sm text-danger">{fe.feed_slug}</p>}
      </section>

      <div className="flex items-center gap-4 border-t border-line pt-6">
        <button type="submit" disabled={pending} className={buttonClass({ size: "lg" })}>
          {pending ? "Saving…" : mode === "create" ? "Create show" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
