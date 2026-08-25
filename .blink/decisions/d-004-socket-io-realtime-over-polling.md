---
id: d-004
title: socket.io real-time delivery instead of the spec's 60s polling
status: accepted
date: 2026-06-04
updated: 2026-08-25T12:30:00Z
tags: [realtime, notifications]
---

## Context
The Slice 4 spec placeheld notification delivery as a 60-second client poll.

## Decision
Deliver notifications over socket.io, emitted best-effort from
`notificationService.create`. In dev the handshake falls back to HTTP
long-polling through the Next proxy.

## Consequences
Real-time is immediate rather than up to a minute stale, and the poll timer is
gone. Two follow-ups fall out of it and are tracked as tasks: Next's `rewrites()`
does not reliably forward the raw `Upgrade` handshake, so production needs a
WS-aware proxy, and a second backend instance needs the socket.io Redis adapter
before it can fan out.
