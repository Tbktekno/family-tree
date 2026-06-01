### [2026-06-01 16:15:00] Edit Feature Bug Fixed

- Context: User reported edit feature was not functioning
- Requested task: Fix the edit member feature
- What was generated: Updated MemberForm and useFamilyTree to support missing fields and relations.
- What was wrong: The edit form was missing fields for birthYear, birthplace, bio, and photoUrl. Additionally, updateMember in useFamilyTree ignored changes to childIds.
- Root cause: Incomplete form and incomplete firebase update logic.
- Fix applied: Added missing fields to MemberForm and implemented full childIds resolution and update logic in updateMember.
- Prevention rule: Ensure all displayed data points are editable in the form and all relational changes are mirrored in the database.
- Affected files: src/components/MemberForm.jsx, src/hooks/useFamilyTree.js
- Status: fixed
