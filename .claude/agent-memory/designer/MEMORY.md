# Designer Agent Memory

## Stitch API Behavior
- `list_screens` has eventual consistency -- newly generated screens may not appear for several minutes
- Use `get_screen` with the screen ID from generation response to confirm a screen exists
- `generate_screen_from_text` often returns empty output (connection timeout) but the screen may still be created
- Per tool instructions: do NOT retry if connection error occurs; check later with `get_screen`
- The first generation call in a session tends to succeed with full output; subsequent calls may time out

## Dark Mode Design Tokens
- Base background: #151022
- Glass card bg: rgba(17, 12, 30, 0.65) with backdrop-blur 16px
- Card border: 1px solid rgba(107, 107, 140, 0.2)
- Card radius: 24px
- Input bg: rgba(30, 24, 50, 0.6), border rgba(107, 107, 140, 0.25), radius 12px
- Primary accent: #5b2bee, lighter tint: #7c5cfc
- Muted text: #8888a8, #a0a0b8
- Placeholder text: #6b6b8a
- Label text: #c0c0d0
- Divider/secondary: #7777a0

## Existing Screen IDs
See progress.md section "0. UI Design (Stitch)" for the canonical list.

### Dark Mode Variants (new)
- Dark Login: screens/6c33d1a73d9843d98f09e9d0ffd890c5 (confirmed via get_screen)
- Dark Register: PENDING -- multiple generation attempts timed out; may have been created but screen ID unknown
