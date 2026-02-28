# Guest Portal Implementation Snapshot (Legacy)

This document is now a short status snapshot. Detailed technical content has moved to canonical guides.

## Current status

- Guest portal is implemented and in active use.
- Token-based guest access (`/guest/:token`) is the primary auth model for guests.
- Core guest flows (RSVP, itinerary, add-ons, requests, ID handling, self-management) are represented in the current app and docs.

## Canonical references

- Technical design and API shape: [GUEST_PORTAL_GUIDE.md](./GUEST_PORTAL_GUIDE.md)
- Agent operations and link handling: [AGENT_GUEST_LINK_GUIDE.md](./AGENT_GUEST_LINK_GUIDE.md)
- Current status and known issues: [PROGRESS.md](./PROGRESS.md)

## Why this file was reduced

The previous version repeated implementation details that are already maintained in multiple other docs and had setup snippets that no longer match the current project workflow.
