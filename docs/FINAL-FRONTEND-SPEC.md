# BuildCore Final Frontend Spec — V10

## Owner
تامر صلاح قرني — Owner / full permissions.

## Team lifecycle
- Partners and employees are deactivated/archived rather than destructively deleted.
- Historical records remain attached to the original person.
- Owner can add, edit, deactivate and restore team members.
- Partners cannot delete other partners or themselves.
- Employees cannot manage team membership.

## Partner profile
Name, phone, email, role, join date, partnership percentage, notes, active/inactive status, projects and historical activity.

## Firebase preparation
The frontend intentionally keeps this lifecycle compatible with Firestore/Auth:
- users/{uid}
- status: active | inactive
- role: owner | partner | employee
- joinedAt
- deactivatedAt
- historical references are never destructively removed.
