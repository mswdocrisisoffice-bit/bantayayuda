-- Allow distribution records to be archived from Reports.
-- Archived records are hidden from Reports and listed in the Archive tab,
-- where they can be restored (archived_at = null) or deleted permanently.

alter table public.distributions
  add column if not exists archived_at timestamptz;

create index if not exists distributions_archived_at_idx
  on public.distributions (archived_at)
  where archived_at is not null;
