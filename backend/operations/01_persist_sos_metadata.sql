-- Persist SOS metadata so priority, route, and risk views work across devices.
alter table rescue_incidents add column if not exists original_message text;
alter table rescue_incidents add column if not exists needs_rescue boolean default false;
alter table rescue_incidents add column if not exists needs_shelter boolean default false;