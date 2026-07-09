"use client";

import { useState } from "react";
import { CardImage } from "@/features/cards/components/card-image";
import { EnergyIcon } from "@/features/cards/components/energy-icon";
import {
  DECK_SIZE,
  type DeckRuleViolation,
  MAX_ENERGY_TYPES,
  MIN_ENERGY_TYPES,
} from "../deck-rules";
import { registrableEnergyTypes } from "../schema";
import { useDeckDerived, useDeckStore } from "../store-context";
import styles from "./deck-panel.module.css";

/**
 * A stable React key per violation. The `rule` alone isn't unique — copy-limit
 * and unknown-card can recur (per name / per id) on a loaded corrupt deck — so
 * fold in the offending name or id.
 */
function violationKey(violation: DeckRuleViolation): string {
  if (violation.rule === "unknown-card") {
    return `unknown-card:${violation.cardId}`;
  }
  if (violation.rule === "copy-limit") {
    return `copy-limit:${violation.cardName}`;
  }
  return violation.rule;
}

/**
 * The deck panel: the always-visible working state of the deck — name, the
 * 20-card counter and legality, registered energy, live violations and advice,
 * the included cards, and Save. On mobile it condenses to a summary that
 * expands. Legality and advice come straight from the domain layer via
 * {@link useDeckDerived}; nothing re-implements a rule here.
 */

type DeckPanelProps = {
  /** Called after a brand-new deck is saved, so the route can adopt its id. */
  onSavedNew: (deckId: string) => void;
};

export function DeckPanel({ onSavedNew }: DeckPanelProps) {
  const name = useDeckStore((state) => state.name);
  const setName = useDeckStore((state) => state.setName);
  const energyTypes = useDeckStore((state) => state.energyTypes);
  const toggleEnergyType = useDeckStore((state) => state.toggleEnergyType);
  const save = useDeckStore((state) => state.save);
  const saveResult = useDeckStore((state) => state.saveResult);
  const { violations, advice, entries, count, isLegal } = useDeckDerived();

  const [expanded, setExpanded] = useState(false);

  function handleSave() {
    const result = save();
    if (result.ok && result.wasNew) {
      onSavedNew(result.deckId);
    }
  }

  const legalityLabel = isLegal ? "Legal deck" : "Not legal yet";

  return (
    <section
      className={styles.panel}
      data-testid="deck-panel"
      data-expanded={expanded}
      aria-label="Deck"
    >
      <div className={styles.summary}>
        <p className={styles.count} data-testid="deck-card-count" aria-live="polite">
          <span className={styles.countValue}>
            {count} / {DECK_SIZE}
          </span>{" "}
          cards ·{" "}
          <span className={styles.legality} data-testid="deck-legality" data-legal={isLegal}>
            {isLegal ? "✓ " : "! "}
            {legalityLabel}
          </span>
        </p>
        <button
          type="button"
          className={styles.toggle}
          data-testid="deck-panel-toggle"
          aria-expanded={expanded}
          aria-controls="deck-panel-body"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Hide deck" : "Show deck"}
        </button>
      </div>

      <div className={styles.body} id="deck-panel-body" data-testid="deck-panel-body">
        <div className={styles.field}>
          <label className={styles.label} htmlFor="deck-name-input">
            Deck name
          </label>
          <input
            id="deck-name-input"
            className={styles.input}
            data-testid="deck-name-input"
            type="text"
            placeholder="Untitled deck"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <fieldset className={styles.energy} data-testid="deck-energy">
          <legend className={styles.legend}>
            Energy Zone{" "}
            <span className={styles.legendHint}>
              (register {MIN_ENERGY_TYPES}–{MAX_ENERGY_TYPES})
            </span>
          </legend>
          <div className={styles.energyOptions}>
            {registrableEnergyTypes.map((type) => {
              const selected = energyTypes.includes(type);
              return (
                <button
                  key={type}
                  type="button"
                  className={styles.energyOption}
                  data-testid={`deck-energy-${type}`}
                  data-selected={selected}
                  aria-pressed={selected}
                  aria-label={type}
                  title={type}
                  onClick={() => toggleEnergyType(type)}
                >
                  <EnergyIcon type={type} />
                </button>
              );
            })}
          </div>
        </fieldset>

        {violations.length > 0 ? (
          <div className={styles.violations} data-testid="deck-violations" aria-live="polite">
            <h2 className={styles.sectionHeading}>Fix before it&rsquo;s legal</h2>
            <ul className={styles.messageList}>
              {violations.map((violation) => (
                <li
                  key={violationKey(violation)}
                  className={styles.violation}
                  data-testid="deck-violation"
                >
                  {violation.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {advice.length > 0 ? (
          <div className={styles.advice} data-testid="deck-advice" aria-live="polite">
            <h2 className={styles.sectionHeading}>Suggestions</h2>
            <ul className={styles.messageList}>
              {advice.map((item) => (
                <li key={item.message} className={styles.adviceItem} data-testid="deck-advice-item">
                  {item.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.entries} data-testid="deck-entries">
          <h2 className={styles.sectionHeading}>Cards</h2>
          {entries.length > 0 ? (
            <ul className={styles.entryList}>
              {entries.map(({ card, count: copies }) => (
                <li
                  className={styles.entry}
                  data-testid="deck-entry"
                  data-card-id={card.id}
                  key={card.id}
                >
                  <span className={styles.entryThumb}>
                    <CardImage
                      src={card.imageUrl}
                      alt={card.name}
                      fallback={{
                        name: card.name,
                        typeLabel: card.typeLabel,
                        kindLabel: card.kindLabel,
                        hp: card.hp,
                      }}
                    />
                  </span>
                  <span className={styles.entryName}>{card.name}</span>
                  <span className={styles.entryCount} data-testid="deck-entry-count">
                    ×{copies}
                  </span>
                  <RemoveButton cardId={card.id} cardName={card.name} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.entriesEmpty}>No cards yet — add them from the picker.</p>
          )}
        </div>

        <button
          type="button"
          className={styles.save}
          data-testid="deck-save-button"
          onClick={handleSave}
        >
          Save deck
        </button>

        {saveResult.status !== "idle" ? (
          <p
            className={saveResult.status === "error" ? styles.saveError : styles.saveSuccess}
            data-testid="deck-save-message"
            data-status={saveResult.status}
            role={saveResult.status === "error" ? "alert" : "status"}
          >
            {saveResult.message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

type RemoveButtonProps = {
  cardId: string;
  cardName: string;
};

function RemoveButton({ cardId, cardName }: RemoveButtonProps) {
  const removeCard = useDeckStore((state) => state.removeCard);
  return (
    <button
      type="button"
      className={styles.entryRemove}
      data-testid="deck-entry-remove"
      onClick={() => removeCard(cardId)}
      aria-label={`Remove one ${cardName}`}
    >
      −
    </button>
  );
}
