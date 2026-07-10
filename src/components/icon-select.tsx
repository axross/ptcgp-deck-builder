"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./icon-select.module.css";

/** One choice: a machine value, its visible label, and an optional pictogram. */
export type IconSelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type IconSelectProps = {
  /** The trigger's element id, so a visible `<label htmlFor>` can name it. */
  id: string;
  /** Accessible name for the popup listbox (the control's axis, e.g. "Type"). */
  label: string;
  /** The selected option's value; `""` selects the placeholder ("all") option. */
  value: string;
  /** Label of the leading clear option and the trigger text when nothing is selected. */
  placeholder: string;
  options: readonly IconSelectOption[];
  onChange: (value: string) => void;
  "data-testid"?: string;
};

/**
 * A single-select dropdown whose options carry a pictogram next to their text —
 * the one thing a native `<select>` cannot render. Implements the WAI-ARIA
 * select-only combobox pattern: the trigger keeps DOM focus while
 * `aria-activedescendant` tracks the highlighted option; ArrowUp/Down/Home/End
 * move it, Enter/Space commit, Escape closes, and focus loss (Tab, outside
 * click) closes without committing. A leading placeholder option clears the
 * selection, mirroring a native select's empty option. Options are a flat,
 * fully visible list — no type-ahead, sized for the app's ≤ 10-option filters.
 */
export function IconSelect({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
  "data-testid": testId,
}: IconSelectProps) {
  const allOptions: readonly IconSelectOption[] = [{ value: "", label: placeholder }, ...options];
  const selectedIndex = allOptions.findIndex((option) => option.value === value);
  const selected = selectedIndex === -1 ? allOptions[0] : allOptions[selectedIndex];

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxRef = useRef<HTMLDivElement>(null);

  const listboxId = `${id}-listbox`;
  function optionId(option: IconSelectOption): string {
    return `${id}-option-${option.value === "" ? "all" : option.value}`;
  }

  function openList() {
    setActiveIndex(selectedIndex === -1 ? 0 : selectedIndex);
    setOpen(true);
  }

  function commit(index: number) {
    setOpen(false);
    const next = allOptions[index];
    if (next !== undefined && next.value !== selected.value) {
      onChange(next.value);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      // Enter/Space fire the native click, which toggles via onClick.
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, allOptions.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(allOptions.length - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        // Let focus move on; the blur handler closes the popup.
        setOpen(false);
        break;
      default:
        break;
    }
  }

  // Keep the highlighted option visible when the list overflows.
  useEffect(() => {
    if (!open) {
      return;
    }
    const active = listboxRef.current?.children.item(activeIndex);
    active?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  return (
    <div className={styles.root}>
      <button
        type="button"
        id={id}
        className={styles.trigger}
        data-testid={testId}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? optionId(allOptions[activeIndex] ?? selected) : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
      >
        <span className={styles.triggerValue} data-placeholder={selected.value === ""}>
          {selected.icon !== undefined ? (
            <span className={styles.optionIcon}>{selected.icon}</span>
          ) : null}
          <span className={styles.optionLabel}>{selected.label}</span>
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={listboxRef}
          id={listboxId}
          className={styles.listbox}
          role="listbox"
          aria-label={label}
          // Keep DOM focus on the trigger for any press inside the popup —
          // including its scrollbar, which would otherwise blur-close it.
          onMouseDown={(event) => event.preventDefault()}
        >
          {allOptions.map((option, index) => (
            // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard interaction lives on the combobox trigger (which keeps DOM focus and tracks this option via aria-activedescendant), per the ARIA select-only combobox pattern.
            <div
              key={option.value}
              id={optionId(option)}
              className={styles.option}
              data-testid={testId === undefined ? undefined : `${testId}-option`}
              data-value={option.value}
              data-active={index === activeIndex}
              role="option"
              aria-selected={option.value === selected.value}
              tabIndex={-1}
              onMouseMove={() => setActiveIndex(index)}
              onClick={() => commit(index)}
            >
              {option.icon !== undefined ? (
                <span className={styles.optionIcon}>{option.icon}</span>
              ) : null}
              <span className={styles.optionLabel}>{option.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
