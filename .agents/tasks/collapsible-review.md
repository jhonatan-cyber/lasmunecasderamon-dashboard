# Collapsible product info section in ProductForm

The change wraps `<ProductBasicFields>` in a `Collapsible` triggered by a
chevron button, so the product's basic fields can be collapsed. The initial open
state is derived from `defaultInfoOpen = !(isEdit && presentation !== null)`,
meaning the section starts closed when editing a scoped presentation and open in
all other cases. The same commit also gates the footer "Guardar/Actualizar"
button behind `!(initialValues && presentation)`, removing the second save
button that appeared next to Cancel in scoped-edit mode.

Watch for: `infoOpen` is initialised once from `defaultInfoOpen` at mount — if
`open` (the dialog's visibility prop) toggles, the state does **not** reset, so
re-opening the dialog for a different context leaves the panel in whatever state
the user last left it. Confirmed.

**Verdict**: NEEDS_CHANGES

## High-level view

Only `<ProductBasicFields>` moves inside `<CollapsibleContent>`; the description
textarea and the ml-por-corto section remain outside under their existing
guards. The trigger is a Button with `variant='unstyled'` and all conditional
classes via `cn()`; no inline styles.

`useState(defaultInfoOpen)` captures the open/closed rule only at mount. If the
same `ProductForm` instance stays mounted while the dialog toggles (possible
given the Dialog architecture here), re-opening for a different context leaves
the panel in whatever state the user last set — there is no reset effect.

The footer save-button gating (`!(initialValues && presentation)`) is a separate
behavioural fix bundled into the same commit. It hides the button for
scoped-edit contexts, which aligns with the intended UX but complicates bisect.

<details>
<summary>Issues (2)</summary>

1. **Stale collapsible state on dialog re-open** — `useState(defaultInfoOpen)`
   only runs once; if the dialog component is not unmounted between sessions,
   the panel stays in its last state regardless of whether the new open context
   is scoped or not. Add a `useEffect` that resets `infoOpen` to
   `defaultInfoOpen` when `open` transitions from `false` to `true`, or when
   `presentation` changes. Confirmed.

2. **Unrelated button change in the same commit** — The footer save-button
   gating (`!(initialValues && presentation)`) is a separate behavioural fix
   bundled with the collapsible. Not a blocking issue, but worth separating in
   the commit history for cleaner bisect and rollback.

</details>

<details>
<summary>Details</summary>

### Stale initial state across dialog re-opens

`defaultInfoOpen` is a derived constant, not a reactive signal.
`useState(defaultInfoOpen)` reads it exactly once — at the component's first
mount. If `ProductForm` remains mounted while `open` toggles (which is possible
when `ProductFormModal` keeps the inner form alive between dialog open/close
cycles), the collapsible retains whatever state the user last set. The intent of
the rule — closed for scoped edits, open otherwise — only holds on first mount.

The fix is a `useEffect` keyed on `open`:

```ts
useEffect(() => {
  if (open) setInfoOpen(!(isEdit && presentation !== null));
}, [open]);
```

This resets to the computed default each time the dialog opens, regardless of
prior interaction.

</details>

---

<details>
<summary>Files changed</summary>

| File                                  | What changed                                                                                                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/products/ProductForm.tsx` | Added `Collapsible` wrapper around `ProductBasicFields`; added `infoOpen` state; gated footer save button on non-scoped context; added `ChevronDown`, `Collapsible*`, `cn` imports |

Full diff: `git diff a2c147f9..ab27a9cd -- components/products/ProductForm.tsx`

</details>
