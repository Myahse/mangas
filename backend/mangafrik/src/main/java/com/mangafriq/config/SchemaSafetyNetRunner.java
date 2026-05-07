package com.mangafriq.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;


@Component
@Slf4j
@Order(Integer.MIN_VALUE)
public class SchemaSafetyNetRunner implements ApplicationRunner {
	private final JdbcTemplate jdbc;

	public SchemaSafetyNetRunner(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	@Override
	public void run(ApplicationArguments args) {
		ensureAppUsersAuthColumns();
		ensureMangaCoreSchema();
		ensureChaptersAndPagesSchema();
		ensureGenresAndMangaGenresSchema();
		ensureAdminAuditsTable();
		ensureCreatorRequestsTable();
		ensureCreatorPanelSchema();
		ensureSupportSchema();
		ensureFinanceTransactionsTable();
		ensureCoinsWalletSchema();
		ensureFeatureFlagsTable();
		ensureCoinPurchaseIntentsTable();
	}

	private void ensureAppUsersAuthColumns() {
		// Matches Flyway V1 — covers environments where Flyway is disabled or an empty DB is wired first.
		jdbc.execute("""
			create table if not exists app_users (
			  id bigserial primary key,
			  email text not null unique,
			  display_name text,
			  created_at timestamptz not null default now()
			);
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists role text not null default 'reader';
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists roles text[] not null default '{reader}';
			""");
	
		jdbc.execute("""
			update app_users
			set roles = array[coalesce(nullif(trim(role), ''), 'reader')]
			where (roles is null) or (array_length(roles, 1) is null) or (roles = '{}'::text[]) or (roles = '{reader}'::text[]);
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists status text not null default 'active';
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists password_hash text;
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists must_change_password boolean not null default false;
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists password_changed_at timestamptz;
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists profile jsonb not null default '{}'::jsonb;
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists updated_at timestamptz not null default now();
			""");

	
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists referral_code text;
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists referred_by_user_id bigint;
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists referred_at timestamptz;
			""");
		jdbc.execute("""
			alter table if exists app_users
			  add column if not exists referral_rewarded boolean not null default false;
			""");
		jdbc.execute("""
			create unique index if not exists app_users_referral_code_uq
			  on app_users (lower(referral_code))
			  where referral_code is not null and trim(referral_code) <> '';
			""");
		jdbc.execute("""
			create index if not exists app_users_referred_by_idx
			  on app_users (referred_by_user_id);
			""");
	}

	/**
	 * Catalog {@code manga} must exist with columns used by creator submission upserts.
	 * Flyway normally creates this (V1+); this covers Flyway-off or drifted Neon/custom DDL.
	 */
	private void ensureMangaCoreSchema() {
		jdbc.execute("create extension if not exists pgcrypto");
		jdbc.execute("""
				create table if not exists manga (
				  id uuid primary key default gen_random_uuid(),
				  title text not null default 'Untitled',
				  slug text not null default '',
				  author text,
				  artist text,
				  cover text,
				  banner text,
				  hero_cover text,
				  rating numeric(3,2) not null default 0,
				  status text,
				  views bigint not null default 0,
				  synopsis text,
				  featured boolean not null default false,
				  year int,
				  created_at timestamptz not null default now(),
				  updated_at timestamptz not null default now()
				);
				""");
		jdbc.execute("alter table if exists manga add column if not exists synopsis text");
		jdbc.execute("alter table if exists manga add column if not exists cover text");
		jdbc.execute("alter table if exists manga add column if not exists hero_cover text");
		jdbc.execute("alter table if exists manga add column if not exists banner text");
		jdbc.execute("alter table if exists manga add column if not exists status text");
		jdbc.execute("alter table if exists manga add column if not exists title text");
		jdbc.execute("alter table if exists manga add column if not exists slug text");
		jdbc.execute("alter table if exists manga add column if not exists created_at timestamptz not null default now()");
		jdbc.execute("alter table if exists manga add column if not exists updated_at timestamptz not null default now()");
		jdbc.execute("alter table if exists manga add column if not exists author text");
		jdbc.execute("alter table if exists manga add column if not exists artist text");
		jdbc.execute("alter table if exists manga add column if not exists rating numeric(3,2) not null default 0");
		jdbc.execute("alter table if exists manga add column if not exists views bigint not null default 0");
		jdbc.execute("alter table if exists manga add column if not exists featured boolean not null default false");
		jdbc.execute("alter table if exists manga add column if not exists year int");
		jdbc.execute("""
				create unique index if not exists uq_manga_slug_safety on manga (slug)
				""");
	}

	/**
	 * Public catalog list queries join {@code chapters}; without these tables the API returns 500.
	 * Flyway V1 creates them for full installs; drifted DBs that only have {@code manga} need this.
	 */
	private void ensureChaptersAndPagesSchema() {
		try {
			jdbc.execute("create extension if not exists pgcrypto");
			jdbc.execute("""
					create table if not exists chapters (
					  id uuid primary key default gen_random_uuid(),
					  manga_id uuid not null references manga(id) on delete cascade,
					  number int not null,
					  title text,
					  published_date text,
					  pages_count int not null default 0,
					  created_at timestamptz not null default now(),
					  updated_at timestamptz not null default now(),
					  unique (manga_id, number)
					);
					""");
			jdbc.execute("create index if not exists idx_chapters_manga_id on chapters (manga_id)");
			jdbc.execute("""
					create table if not exists pages (
					  id uuid primary key default gen_random_uuid(),
					  chapter_id uuid not null references chapters(id) on delete cascade,
					  number int not null,
					  url text not null,
					  created_at timestamptz not null default now(),
					  unique (chapter_id, number)
					);
					""");
			jdbc.execute("create index if not exists idx_pages_chapter_id on pages (chapter_id)");
		} catch (Exception e) {
			log.warn("ensureChaptersAndPagesSchema skipped: {}", e.getMessage());
		}
	}

	/**
	 * Junction table for catalog genres; required for creator submission genre sync.
	 * Skipped quietly when legacy bigint schemas make FK creation impossible until Flyway V25 runs.
	 */
	private void ensureGenresAndMangaGenresSchema() {
		try {
			jdbc.execute("""
					create table if not exists genres (
					  id uuid primary key default gen_random_uuid(),
					  name text not null unique,
					  created_at timestamptz not null default now()
					);
					""");
			jdbc.execute("""
					create table if not exists manga_genres (
					  manga_id uuid not null references manga(id) on delete cascade,
					  genre_id uuid not null references genres(id) on delete cascade,
					  primary key (manga_id, genre_id)
					);
					""");
		} catch (Exception e) {
			log.warn("ensureGenresAndMangaGenresSchema skipped: {}", e.getMessage());
		}
	}

	/** Optional audit trail; must exist for {@code AdminStore#audit} used by creator publish. */
	private void ensureAdminAuditsTable() {
		try {
			jdbc.execute("""
					create table if not exists admin_audits (
					  id uuid primary key,
					  at timestamptz not null default now(),
					  action text not null,
					  payload jsonb not null default '{}'::jsonb
					);
					""");
			jdbc.execute("""
					create index if not exists idx_admin_audits_at on admin_audits (at desc);
					""");
		} catch (Exception e) {
			log.warn("ensureAdminAuditsTable skipped: {}", e.getMessage());
		}
	}

	private void ensureCreatorRequestsTable() {
		jdbc.execute("""
			create table if not exists creator_requests (
			  id uuid primary key,
			  email text not null,
			  creator_email text,
			  display_name text not null,
			  pen_name text,
			  genres text,
			  message text,
			  status text not null default 'pending',
			  review_reason text,
			  created_at timestamptz not null default now(),
			  reviewed_at timestamptz
			);
			""");
		jdbc.execute("""
			alter table if exists creator_requests
			  add column if not exists creator_email text;
			""");
		jdbc.execute("""
			create index if not exists idx_creator_requests_status_created_at
			  on creator_requests(status, created_at desc);
			""");
	}

	private void ensureCreatorPanelSchema() {
		
		jdbc.execute("""
			create table if not exists creator_manga_submissions (
			  id uuid primary key,
			  status text not null default 'approved',
			  created_at timestamptz not null default now(),
			  creator_email text not null default '',
			  creator_display_name text not null default '',
			  payload jsonb not null default '{}'::jsonb,
			  moderation_decision text,
			  moderation_reason text not null default '',
			  moderation_reviewed_at timestamptz
			);
			""");
		jdbc.execute("""
			create index if not exists idx_creator_manga_submissions_created_at
			  on creator_manga_submissions(created_at desc);
			""");
		jdbc.execute("""
			create index if not exists idx_creator_manga_submissions_creator_email
			  on creator_manga_submissions(lower(creator_email));
			""");

		jdbc.execute("""
			create table if not exists creator_episode_drafts (
			  id uuid primary key,
			  created_at timestamptz not null default now(),
			  series_title text not null default '',
			  episode_title text not null default '',
			  creator_note text,
			  comments_enabled boolean not null default true,
			  publish_mode text not null default '',
			  publish_at text not null default '',
			  thumb jsonb,
			  images jsonb not null default '[]'::jsonb
			);
			""");
		jdbc.execute("""
			create index if not exists idx_creator_episode_drafts_created_at
			  on creator_episode_drafts(created_at desc);
			""");

		jdbc.execute("""
			create table if not exists creator_published_episodes (
			  id uuid primary key,
			  published_at timestamptz not null default now(),
			  scheduled_for text,
			  series_title text not null default '',
			  episode_title text not null default '',
			  creator_note text,
			  comments_enabled boolean not null default true,
			  thumb jsonb,
			  images jsonb not null default '[]'::jsonb,
			  stats jsonb not null default '{}'::jsonb,
			  comments jsonb not null default '[]'::jsonb
			);
			""");
		jdbc.execute("""
			create index if not exists idx_creator_published_episodes_published_at
			  on creator_published_episodes(published_at desc);
			""");
	}

	private void ensureSupportSchema() {
		jdbc.execute("""
			create table if not exists support_tickets (
			  id uuid primary key,
			  type text not null,
			  status text not null,
			  subject text not null,
			  description text not null,
			  user_id uuid not null,
			  user_name text not null,
			  user_email text not null,
			  created_at timestamptz not null default now(),
			  updated_at timestamptz not null default now(),
			  validation_note text not null default '',
			  rejection_reason text not null default ''
			);
			""");
		jdbc.execute("""
			create index if not exists idx_support_tickets_status on support_tickets(status);
			""");
		jdbc.execute("""
			create index if not exists idx_support_tickets_created_at on support_tickets(created_at desc);
			""");

		jdbc.execute("""
			create table if not exists support_messages (
			  id uuid primary key,
			  ticket_id uuid not null references support_tickets(id) on delete cascade,
			  at timestamptz not null default now(),
			  from_role text not null,
			  text text not null,
			  attachment_key text,
			  attachment_name text,
			  attachment_content_type text
			);
			""");
		jdbc.execute("""
			alter table if exists support_messages add column if not exists attachment_key text;
			""");
		jdbc.execute("""
			alter table if exists support_messages add column if not exists attachment_name text;
			""");
		jdbc.execute("""
			alter table if exists support_messages add column if not exists attachment_content_type text;
			""");
		jdbc.execute("""
			create index if not exists idx_support_messages_ticket_at on support_messages(ticket_id, at asc);
			""");
		jdbc.execute("""
			create table if not exists support_audits (
			  id uuid primary key,
			  at timestamptz not null default now(),
			  action text not null,
			  payload jsonb not null default '{}'::jsonb
			);
			""");
		jdbc.execute("""
			create index if not exists idx_support_audits_at on support_audits(at desc);
			""");
	}

	private void ensureFinanceTransactionsTable() {
		jdbc.execute("""
			create table if not exists finance_transactions (
			  id uuid primary key,
			  type text not null,
			  amount numeric(18,2) not null,
			  currency text not null,
			  reference text,
			  note text,
			  created_at timestamptz not null default now()
			);
			""");
		jdbc.execute("""
			create index if not exists finance_transactions_created_at_idx
			  on finance_transactions (created_at desc);
			""");
	}

	private void ensureCoinsWalletSchema() {
		jdbc.execute("""
			create table if not exists coin_ledger (
			  id uuid primary key,
			  user_id bigint not null references app_users(id) on delete cascade,
			  type text not null,
			  amount int not null,
			  ref_type text,
			  ref_id text,
			  created_at timestamptz not null default now()
			);
			""");
		jdbc.execute("""
			create index if not exists coin_ledger_user_created_at_idx
			  on coin_ledger (user_id, created_at desc);
			""");
		jdbc.execute("""
			create index if not exists coin_ledger_user_ref_idx
			  on coin_ledger (user_id, ref_type, ref_id);
			""");

		jdbc.execute("""
			create table if not exists content_entitlements (
			  id uuid primary key,
			  user_id bigint not null references app_users(id) on delete cascade,
			  scope text not null,
			  manga_slug text not null,
			  chapter_number int not null default -1,
			  unlocked_at timestamptz not null default now(),
			  unique (user_id, scope, manga_slug, chapter_number)
			);
			""");
		jdbc.execute("""
			alter table content_entitlements
			  drop constraint if exists content_entitlements_scope_chapter_ck;
			""");
		jdbc.execute("""
			alter table content_entitlements
			  add constraint content_entitlements_scope_chapter_ck
			  check (
			    (upper(scope) = 'MANGA' and chapter_number = -1)
			    or
			    (upper(scope) = 'CHAPTER' and chapter_number >= 1)
			  );
			""");
		jdbc.execute("""
			create index if not exists content_entitlements_user_slug_idx
			  on content_entitlements (user_id, manga_slug);
			""");

		jdbc.execute("""
			create table if not exists daily_coin_claims (
			  user_id bigint primary key references app_users(id) on delete cascade,
			  last_claim_date date not null
			);
			""");
	}

	private void ensureFeatureFlagsTable() {
		jdbc.execute("""
			create table if not exists app_feature_flags (
			  key text primary key,
			  enabled boolean not null,
			  updated_at timestamptz not null default now()
			);
			""");
		jdbc.execute("""
			insert into app_feature_flags (key, enabled)
			values
			  ('coins.rewards.enabled', true),
			  ('coins.payments.enabled', false)
			on conflict (key) do nothing;
			""");
	}

	private void ensureCoinPurchaseIntentsTable() {
		jdbc.execute("""
			create table if not exists coin_purchase_intents (
			  id uuid primary key,
			  user_id bigint not null references app_users(id) on delete cascade,
			  pack_id text not null,
			  coins int not null,
			  currency text not null default 'XOF',
			  amount int not null,
			  status text not null default 'pending',
			  provider text not null default 'manual',
			  provider_ref text,
			  created_at timestamptz not null default now(),
			  updated_at timestamptz not null default now()
			);
			""");
		jdbc.execute("""
			create index if not exists coin_purchase_intents_user_created_at_idx
			  on coin_purchase_intents (user_id, created_at desc);
			""");
		jdbc.execute("""
			create index if not exists coin_purchase_intents_status_idx
			  on coin_purchase_intents (status);
			""");
	}
}

