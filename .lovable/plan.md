

## Analysis

I found the root cause of incorrect leave balance deductions:

**Problem: Duplicate Triggers Causing Double-Deduction**

Two triggers are calling the same `deduct_leave_balance_on_approval` function:
- `trg_deduct_leave_on_approval` (BEFORE UPDATE)
- `on_leave_approved` (AFTER UPDATE)

When a leave is approved, both triggers fire and the function runs twice, causing **double deduction** of leave balances.

**Function Logic Verified:**
The `deduct_leave_balance_on_approval` function itself is correct:
- Uses `SET used = used + X` (incremental, not resetting)
- Follows CL → EL → ML order
- Stops when `remaining_days = 0`
- LOP is not stored (calculated in UI)

## Plan

### Step 1: Remove Duplicate Trigger
Drop the redundant `trg_deduct_leave_on_approval` trigger, keeping only `on_leave_approved` (AFTER UPDATE is preferred for this type of operation).

### Step 2: Reset Corrupted Data
Reset all leave balance `used` values to 0 since existing data was corrupted by double-deductions.

```sql
-- Drop duplicate trigger
DROP TRIGGER IF EXISTS trg_deduct_leave_on_approval ON public.leave_requests;

-- Reset corrupted used values
UPDATE public.leave_balances 
SET used = 0 
WHERE leave_type IN ('casual', 'earned', 'medical', 'od');
```

### Technical Details
- The remaining `on_leave_approved` trigger will correctly apply incremental deductions: `CL_used = CL_used + use_CL`
- The guard condition `IF NEW.status <> 'approved' OR OLD.status = 'approved'` prevents re-processing
- No UI changes required

