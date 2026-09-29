"use client";

import { useState } from "react";
import { Drawer, useModal } from "@payloadcms/ui";
import styles from "./KanbanBoard.module.css";
import { drawerScrollRef } from "./drawer-scroll";
import { SOURCE_LABELS, TYPE_LABELS } from "./format";
import type { BoardInquiry, CategoryOption } from "./types";

export const ADD_CARD_DRAWER_SLUG = "kanban-add-card";

// Only the manual sources — this form exists specifically for jobs heard
// about outside the site's own contact form, so "Website form" (the other
// option on Inquiries.source) isn't a real choice here.
const MANUAL_SOURCES = ["manual_social", "manual_email", "manual_referral"] as const;

type ManualSource = (typeof MANUAL_SOURCES)[number];

// The same Drawer + useModal pairing DetailDrawer already uses (see its own
// header comment), mounted once by Board.tsx and toggled via the top bar's
// "Add Card" button. POSTs to /api/inquiries/add-lead, which finds-or-creates
// the Client by email and creates the Inquiry server-side via the Local API
// — this component only owns form state, not that lookup logic.
export default function AddCardDrawer({
  categories,
  onCreated,
}: {
  categories: CategoryOption[];
  onCreated: (inquiry: BoardInquiry, isRepeatClient: boolean) => void;
}) {
  const { closeModal } = useModal();

  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0] ? String(categories[0].id) : "");
  const [type, setType] = useState<"question" | "booking">("question");
  const [date, setDate] = useState("");
  const [source, setSource] = useState<ManualSource>("manual_social");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setClientName("");
    setEmail("");
    setCategoryId(categories[0] ? String(categories[0].id) : "");
    setType("question");
    setDate("");
    setSource("manual_social");
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clientName.trim() || !email.trim() || !categoryId) {
      setError("Fill in the client's name, email, and category.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries/add-lead", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          email: email.trim(),
          category: Number(categoryId),
          type,
          preferredDate: date || undefined,
          source,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : "Failed to add card.");
      }
      onCreated(body.inquiry as BoardInquiry, Boolean(body.isRepeatClient));
      resetForm();
      closeModal(ADD_CARD_DRAWER_SLUG);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add card.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer slug={ADD_CARD_DRAWER_SLUG} className="kanban-drawer" title="Add Card">
      <form className={styles.addCardForm} onSubmit={handleSubmit} ref={drawerScrollRef}>
        <div className={styles.stageField}>
          <label className={styles.detailLabel} htmlFor="add-card-name">
            Client name
          </label>
          <input
            id="add-card-name"
            className={styles.stageSelect}
            type="text"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            required
          />
        </div>

        <div className={styles.stageField}>
          <label className={styles.detailLabel} htmlFor="add-card-email">
            Email
          </label>
          <input
            id="add-card-email"
            className={styles.stageSelect}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className={styles.stageField}>
          <label className={styles.detailLabel} htmlFor="add-card-category">
            Category
          </label>
          <select
            id="add-card-category"
            className={styles.stageSelect}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
            disabled={categories.length === 0}
          >
            {categories.length === 0 ? (
              <option value="">No categories yet</option>
            ) : (
              categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.stageField}>
          <label className={styles.detailLabel} htmlFor="add-card-type">
            Event type
          </label>
          <select
            id="add-card-type"
            className={styles.stageSelect}
            value={type}
            onChange={(event) => setType(event.target.value as "question" | "booking")}
          >
            <option value="question">{TYPE_LABELS.question}</option>
            <option value="booking">{TYPE_LABELS.booking}</option>
          </select>
        </div>

        <div className={styles.stageField}>
          <label className={styles.detailLabel} htmlFor="add-card-date">
            Date
          </label>
          <input
            id="add-card-date"
            className={styles.stageSelect}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>

        <div className={styles.stageField}>
          <label className={styles.detailLabel} htmlFor="add-card-source">
            Source
          </label>
          <select
            id="add-card-source"
            className={styles.stageSelect}
            value={source}
            onChange={(event) => setSource(event.target.value as ManualSource)}
          >
            {MANUAL_SOURCES.map((value) => (
              <option key={value} value={value}>
                {SOURCE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <button type="submit" className={styles.drawerSecondaryButton} disabled={isSubmitting}>
          {isSubmitting ? "Adding…" : "Add Card"}
        </button>
      </form>
    </Drawer>
  );
}
