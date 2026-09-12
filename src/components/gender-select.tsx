"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Gender } from "@/lib/protocol";

const genderOptions: Array<{
  value: Gender;
  label: string;
  icon: string;
}> = [
  {
    value: "male",
    label: "Мужской",
    icon: "/assets/icons/gender-male-icon.svg",
  },
  {
    value: "female",
    label: "Женский",
    icon: "/assets/icons/gender-female-icon.svg",
  },
  {
    value: "other",
    label: "Пара",
    icon: "/assets/icons/gender-any-icon.svg",
  },
];

export function GenderSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: Gender;
  onChange: (value: Gender) => void;
  disabled?: boolean;
}) {
  const selected = Math.max(
    0,
    genderOptions.findIndex((option) => option.value === value),
  );
  const [open, setOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(true);
  const [highlighted, setHighlighted] = useState(selected);
  const [selecting, setSelecting] = useState<Gender | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();
  const expanded = open && !disabled;
  const current = genderOptions[selected];

  useEffect(() => {
    if (!expanded) return;
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
        selectionTimerRef.current = null;
        setSelecting(null);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [expanded]);

  useEffect(() => {
    if (expanded)
      listRef.current?.children[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [expanded, highlighted]);

  useEffect(
    () => () => {
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
    },
    [],
  );

  function showMenu() {
    if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
    selectionTimerRef.current = null;
    setSelecting(null);
    const bounds = rootRef.current?.getBoundingClientRect();
    const menuHeight = 172;
    setOpenAbove(
      Boolean(
        !bounds ||
          bounds.top >= menuHeight ||
          bounds.top > window.innerHeight - bounds.bottom,
      ),
    );
    setOpen(true);
  }

  function choose(index: number) {
    if (selecting) return;
    const next = genderOptions[index].value;
    setHighlighted(index);
    setSelecting(next);
    onChange(next);
    selectionTimerRef.current = setTimeout(() => {
      selectionTimerRef.current = null;
      setOpen(false);
      setSelecting(null);
      buttonRef.current?.focus({ preventScroll: true });
    }, 180);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const { key } = event;
    if (key === "Escape" && expanded) {
      event.preventDefault();
      event.stopPropagation();
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
      setSelecting(null);
      setOpen(false);
    } else if (key === "Tab") {
      if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
      setSelecting(null);
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
      else if (key === "End") index = genderOptions.length - 1;
      else if (expanded)
        index =
          (highlighted +
            (key === "ArrowDown" ? 1 : -1) +
            genderOptions.length) %
          genderOptions.length;
      setHighlighted(index);
    }
  }

  return (
    <div
      ref={rootRef}
      className="filter gender-select"
      data-placement={openAbove ? "top" : "bottom"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        className="gender-trigger"
        role="combobox"
        aria-label="Ваш пол"
        aria-haspopup="listbox"
        aria-controls={expanded ? listId : undefined}
        aria-expanded={expanded}
        aria-activedescendant={expanded ? `${listId}-${highlighted}` : undefined}
        disabled={disabled}
        onKeyDown={onKeyDown}
        onClick={() => {
          setHighlighted(selected);
          if (expanded) {
            if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
            selectionTimerRef.current = null;
            setSelecting(null);
            setOpen(false);
          }
          else showMenu();
        }}
      >
        <span className="gender-value">Ваш пол</span>
        <Image
          key={current.value}
          className="gender-icon"
          src={current.icon}
          width={26}
          height={26}
          alt=""
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <ul
          ref={listRef}
          id={listId}
          className={`gender-options${selecting ? " is-selecting" : ""}`}
          role="listbox"
          aria-label="Ваш пол"
          aria-busy={Boolean(selecting)}
        >
          {genderOptions.map((option, index) => (
            <li
              key={option.value}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={[
                index === highlighted ? "is-highlighted" : "",
                selecting === option.value ? "is-selecting" : "",
              ].filter(Boolean).join(" ")}
              onPointerMove={() => setHighlighted(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <Image
                className="gender-option-icon"
                src={option.icon}
                width={26}
                height={26}
                alt=""
                aria-hidden="true"
              />
              <span>{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
