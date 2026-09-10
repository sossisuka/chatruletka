"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { countries } from "@/lib/protocol";
import { CountryFlag } from "./country-flag";

const allCountries = [{ code: "all", name: "Всего мира" }, ...countries];

export function CountrySelect({
  label,
  caption,
  value,
  onChange,
  disabled = false,
  includeAll = false,
  className = "",
}: {
  label: string;
  caption?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  includeAll?: boolean;
  className?: string;
}) {
  const options = includeAll ? allCountries : countries;
  const selected = Math.max(
    0,
    options.findIndex((country) => country.code === value),
  );
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [highlighted, setHighlighted] = useState(selected);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typedRef = useRef({ text: "", at: 0 });
  const listId = useId();
  const expanded = open && !disabled;

  useEffect(() => {
    if (!expanded) return;
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [expanded]);

  useEffect(() => {
    if (expanded)
      listRef.current?.children[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [expanded, highlighted]);

  function choose(index: number) {
    onChange(options[index].code);
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  }

  function showMenu() {
    const bounds = rootRef.current?.getBoundingClientRect();
    const height = Math.min(310, window.innerHeight * 0.45);
    setOpenAbove(Boolean(
      caption && bounds && window.innerHeight - bounds.bottom < height &&
      bounds.top > height,
    ));
    setOpen(true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const { key } = event;
    if (key === "Escape" && expanded) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    } else if (key === "Tab") {
      setOpen(false);
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      if (expanded) choose(highlighted);
      else {
        setHighlighted(selected);
        showMenu();
      }
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) {
      event.preventDefault();
      if (!expanded) showMenu();
      let index = selected;
      if (key === "Home") index = 0;
      else if (key === "End") index = options.length - 1;
      else if (expanded)
        index = (highlighted + (key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      setHighlighted(index);
    } else if (
      key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      const text =
        (now - typedRef.current.at < 700 ? typedRef.current.text : "") +
        key.toLocaleLowerCase("ru");
      typedRef.current = { text, at: now };
      const index = options.findIndex((country) =>
        country.name.toLocaleLowerCase("ru").startsWith(text),
      );
      if (index >= 0) {
        setHighlighted(index);
        if (!expanded) showMenu();
      }
    }
  }

  return (
    <div
      ref={rootRef}
      className={`country-select ${className}`}
      data-placement={openAbove ? "top" : "bottom"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="country-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-controls={expanded ? listId : undefined}
        aria-expanded={expanded}
        aria-activedescendant={expanded ? `${listId}-${highlighted}` : undefined}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onClick={() => {
          setHighlighted(selected);
          if (expanded) setOpen(false);
          else showMenu();
        }}
      >
        <CountryFlag code={options[selected].code} />
        <span className="country-value">
          {caption && <small>{caption}</small>}
          <span>{options[selected].name}</span>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {expanded && (
        <ul
          ref={listRef}
          id={listId}
          className="country-options"
          role="listbox"
          aria-label={label}
        >
          {options.map((country, index) => (
            <li
              key={country.code}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={country.code === value}
              className={index === highlighted ? "is-highlighted" : ""}
              onPointerMove={() => setHighlighted(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <CountryFlag code={country.code} />
              <span>{country.name}</span>
              {country.code === value && <Check size={15} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
