"use client";

import {
  Bold,
  Code2,
  Eye,
  FileText,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Monitor,
  Pilcrow,
  Smartphone,
  Type,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeTemplateHtml, renderTemplate } from "@/lib/templates";

const variables = [
  "first_name",
  "last_name",
  "email",
  "locale",
  "role",
  "platform",
  "external_id",
  "campaign_name",
  "unsubscribe_url",
] as const;

const previewVariables = {
  first_name: "Alex",
  last_name: "Morgan",
  email: "alex@example.com",
  locale: "en",
  role: "customer",
  platform: "web",
  external_id: "user_12345",
  campaign_name: "Spring Update",
  unsubscribe_url: "https://example.com/unsubscribe/sample-token",
};

function plainTextFromHtml(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isEmptyHtml(html: string) {
  return plainTextFromHtml(html).length === 0;
}

function wrapEmailHtml(body: string) {
  if (/^\s*(?:<!doctype|<html)/i.test(body)) {
    return body;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f6f8fb;font-family:Arial,sans-serif;color:#17202a;"><div style="margin:0 auto;max-width:640px;background:#ffffff;padding:32px;line-height:1.55;">${body}</div></body></html>`;
}

function looksLikeHtmlSource(value: string) {
  return /<(?:!doctype|html|body|table|div|p|h[1-6]|a|span|img|br)\b/i.test(
    value.trim(),
  );
}

export function EmailTemplateEditor({
  initialHtml = "",
  initialText = "",
}: {
  initialHtml?: string | null;
  initialText?: string | null;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const htmlFieldRef = useRef<HTMLInputElement | null>(null);
  const textFieldRef = useRef<HTMLInputElement | null>(null);
  const previousTabRef = useRef<"visual" | "html" | "text">("visual");
  const [activeTab, setActiveTab] = useState<"visual" | "html" | "text">(
    "visual",
  );
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "text">(
    "desktop",
  );
  const [html, setHtml] = useState(normalizeTemplateHtml(initialHtml ?? ""));
  const [text, setText] = useState(initialText ?? "");

  const renderedHtml = useMemo(
    () =>
      renderTemplate(
        normalizeTemplateHtml(html) ||
          '<p style="color:#64748b;">Your email preview will appear here.</p>',
        previewVariables,
      ),
    [html],
  );
  const renderedText = useMemo(
    () =>
      renderTemplate(
        text.trim() || plainTextFromHtml(html) || "Plain text preview will appear here.",
        previewVariables,
      ),
    [html, text],
  );
  const previewHtml = useMemo(() => wrapEmailHtml(renderedHtml), [renderedHtml]);

  function syncFromEditor() {
    const nextHtml = editorRef.current?.innerHTML ?? "";
    const nextText = text || plainTextFromHtml(nextHtml);
    setHtml(nextHtml);
    setText((current) => current || nextText);
    syncHiddenFields(nextHtml, nextText);
  }

  function syncHiddenFields(nextHtml = html, nextText = text) {
    const normalizedHtml = normalizeTemplateHtml(nextHtml);
    const resolvedText = nextText.trim() || plainTextFromHtml(normalizedHtml);
    if (htmlFieldRef.current) htmlFieldRef.current.value = normalizedHtml;
    if (textFieldRef.current) textFieldRef.current.value = resolvedText;
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncFromEditor();
  }

  function insertVariable(variable: string) {
    runCommand("insertText", `{{${variable}}}`);
  }

  function addLink() {
    const url = window.prompt("Paste the destination URL");
    if (!url) return;
    runCommand("createLink", url);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const pastedText = event.clipboardData.getData("text/plain");
    if (looksLikeHtmlSource(pastedText)) {
      const normalizedHtml = normalizeTemplateHtml(pastedText);
      setHtml(normalizedHtml);
      setText((current) => current || plainTextFromHtml(normalizedHtml));
      if (editorRef.current) editorRef.current.innerHTML = normalizedHtml;
      syncHiddenFields(normalizedHtml, text || plainTextFromHtml(normalizedHtml));
      return;
    }

    document.execCommand("insertText", false, pastedText);
    syncFromEditor();
  }

  useEffect(() => {
    syncHiddenFields();
  }, [html, text]);

  useEffect(() => {
    const normalizedInitialHtml = normalizeTemplateHtml(initialHtml ?? "");
    setHtml(normalizedInitialHtml);
    setText(initialText ?? "");
    if (editorRef.current) {
      editorRef.current.innerHTML = normalizedInitialHtml;
    }
    syncHiddenFields(normalizedInitialHtml, initialText ?? "");
  }, [initialHtml, initialText]);

  useEffect(() => {
    if (
      activeTab === "visual" &&
      previousTabRef.current !== "visual" &&
      editorRef.current
    ) {
      editorRef.current.innerHTML = html;
    }
    previousTabRef.current = activeTab;
  }, [activeTab, html]);

  useEffect(() => {
    const form = htmlFieldRef.current?.form;
    if (!form) return;
    const handleSubmit = () => {
      const latestHtml =
        activeTab === "visual" ? (editorRef.current?.innerHTML ?? html) : html;
      syncHiddenFields(latestHtml, text);
    };
    form.addEventListener("submit", handleSubmit, { capture: true });
    return () => {
      form.removeEventListener("submit", handleSubmit, { capture: true });
    };
  }, [activeTab, html, text]);

  return (
    <div className="space-y-3">
      <input ref={htmlFieldRef} type="hidden" name="htmlContent" required />
      <input ref={textFieldRef} type="hidden" name="textContent" />

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Email body</span>
          <span className="text-xs text-muted">
            Visual editor is enough; HTML and plain text are advanced.
          </span>
        </div>

        <div className="rounded border border-line bg-white">
          <div className="flex flex-wrap items-center gap-1 border-b border-line bg-panel p-2">
            <button
              type="button"
              onClick={() => setActiveTab("visual")}
              className={tabClass(activeTab === "visual")}
            >
              <Type className="h-4 w-4" />
              Visual
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("html")}
              className={tabClass(activeTab === "html")}
            >
              <Code2 className="h-4 w-4" />
              HTML
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("text")}
              className={tabClass(activeTab === "text")}
            >
              <Pilcrow className="h-4 w-4" />
              Plain text
            </button>
          </div>

          {activeTab === "visual" ? (
            <>
              <div className="flex flex-wrap items-center gap-1 border-b border-line p-2">
                <ToolbarButton label="Bold" onClick={() => runCommand("bold")}>
                  <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Italic"
                  onClick={() => runCommand("italic")}
                >
                  <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Heading"
                  onClick={() => runCommand("formatBlock", "h2")}
                >
                  H2
                </ToolbarButton>
                <ToolbarButton
                  label="Paragraph"
                  onClick={() => runCommand("formatBlock", "p")}
                >
                  P
                </ToolbarButton>
                <ToolbarButton
                  label="Bullet list"
                  onClick={() => runCommand("insertUnorderedList")}
                >
                  <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                  label="Numbered list"
                  onClick={() => runCommand("insertOrderedList")}
                >
                  <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton label="Link" onClick={addLink}>
                  <LinkIcon className="h-4 w-4" />
                </ToolbarButton>
              </div>
              <div
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label="Email body visual editor"
                data-empty={isEmptyHtml(html) ? "true" : "false"}
                data-placeholder="Write the email here. Use variables below when needed."
                className="email-editor min-h-[260px] px-4 py-3 text-sm leading-6 outline-none"
                onInput={syncFromEditor}
                onPaste={handlePaste}
                onBlur={syncFromEditor}
                suppressContentEditableWarning
              />
            </>
          ) : null}

          {activeTab === "html" ? (
            <textarea
              value={html}
              onChange={(event) => {
                const nextHtml = event.target.value;
                setHtml(nextHtml);
                syncHiddenFields(nextHtml, text);
              }}
              rows={12}
              placeholder="<p>Hello {{first_name}},</p>"
              className="w-full resize-y border-0 font-mono text-sm leading-6 focus:ring-0"
            />
          ) : null}

          {activeTab === "text" ? (
            <textarea
              value={text}
              onChange={(event) => {
                const nextText = event.target.value;
                setText(nextText);
                syncHiddenFields(html, nextText);
              }}
              rows={12}
              placeholder="Plain text is generated automatically, but you can edit it here."
              className="w-full resize-y border-0 text-sm leading-6 focus:ring-0"
            />
          ) : null}
        </div>
      </div>

      <div className="rounded border border-line bg-panel p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase text-muted">
            Variables
          </div>
          <div className="text-xs text-muted">
            Preview renders with sample data.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {variables.map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium hover:bg-slate-50"
            >
              {"{{"}
              {variable}
              {"}}"}
            </button>
          ))}
        </div>
      </div>

      <section className="overflow-hidden rounded border border-line bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Eye className="h-4 w-4 text-accent" />
            Preview window
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-full border border-line bg-white p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPreviewMode("desktop")}
              className={previewToggleClass(previewMode === "desktop")}
            >
              <Monitor className="h-3.5 w-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("mobile")}
              className={previewToggleClass(previewMode === "mobile")}
            >
              <Smartphone className="h-3.5 w-3.5" />
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode("text")}
              className={previewToggleClass(previewMode === "text")}
            >
              <FileText className="h-3.5 w-3.5" />
              Text
            </button>
          </div>
        </div>

        <div className="bg-[#eef2f7] p-3">
          <div className="mx-auto overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="ml-2 truncate text-xs font-medium text-slate-500">
                Email preview
              </span>
            </div>
            {previewMode === "text" ? (
              <pre className="min-h-[300px] whitespace-pre-wrap bg-white p-4 text-sm leading-6 text-ink">
                {renderedText}
              </pre>
            ) : (
              <div
                className={
                  previewMode === "mobile"
                    ? "mx-auto w-full max-w-[390px] border-x border-slate-200 bg-white"
                    : "w-full bg-white"
                }
              >
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={previewHtml}
                  className="h-[420px] w-full bg-white"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function tabClass(active: boolean) {
  return [
    "inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-semibold transition",
    active ? "bg-white text-ink shadow-sm" : "text-muted hover:bg-white",
  ].join(" ");
}

function previewToggleClass(active: boolean) {
  return [
    "inline-flex min-w-0 items-center justify-center gap-1 rounded-full px-2.5 py-1.5 transition",
    active ? "bg-ink text-white shadow-sm" : "text-muted hover:bg-panel",
  ].join(" ");
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 min-w-8 items-center justify-center rounded border border-line bg-white px-2 text-sm font-semibold hover:bg-panel"
    >
      {children}
    </button>
  );
}
