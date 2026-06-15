CREATE TYPE "public"."social_connection_status" AS ENUM('CONNECTED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TABLE "meta_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"meta_user_id" text NOT NULL,
	"meta_user_name" text,
	"access_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "social_connection_status" DEFAULT 'CONNECTED' NOT NULL,
	"connected_by_user_id" uuid,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meta_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nonce_hash" text NOT NULL,
	"client_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meta_oauth_states_nonce_hash_unique" UNIQUE("nonce_hash")
);
--> statement-breakpoint
CREATE TABLE "social_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"authorization_id" uuid NOT NULL,
	"facebook_page_id" text NOT NULL,
	"facebook_page_name" text NOT NULL,
	"instagram_account_id" text,
	"instagram_username" text,
	"page_access_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"status" "social_connection_status" DEFAULT 'CONNECTED' NOT NULL,
	"last_verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "social_targets" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "meta_authorizations" ADD CONSTRAINT "meta_authorizations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_authorizations" ADD CONSTRAINT "meta_authorizations_connected_by_user_id_users_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_oauth_states" ADD CONSTRAINT "meta_oauth_states_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meta_oauth_states" ADD CONSTRAINT "meta_oauth_states_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "social_connections" ADD CONSTRAINT "social_connections_authorization_id_meta_authorizations_id_fk" FOREIGN KEY ("authorization_id") REFERENCES "public"."meta_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meta_authorizations_client_user_unique" ON "meta_authorizations" USING btree ("client_id","meta_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "social_connections_client_page_unique" ON "social_connections" USING btree ("client_id","facebook_page_id");