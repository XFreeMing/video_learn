CREATE TYPE "public"."participant_type" AS ENUM('internal_agent', 'external_agent', 'human_contributor', 'human_decision_maker', 'tool_worker');--> statement-breakpoint
CREATE TYPE "public"."card_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."card_type" AS ENUM('fact', 'evidence', 'rule', 'process', 'template', 'experience', 'artifact', 'decision');--> statement-breakpoint
CREATE TYPE "public"."project_phase" AS ENUM('init', 'problem_framing', 'structuring', 'evidence_gathering', 'analysis', 'synthesis', 'delivery', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('open', 'claimed', 'submitted', 'accepted', 'rejected', 'revision_required', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('validation', 'evidence', 'research', 'analysis', 'delivery', 'review', 'conflict', 'human');--> statement-breakpoint
CREATE TABLE "agent_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_agent_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"runtime_session_key" text,
	"status" varchar(16) DEFAULT 'idle' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"terminated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "participant_type" NOT NULL,
	"name" text NOT NULL,
	"capabilities" jsonb DEFAULT '[]',
	"permissions" jsonb DEFAULT '[]',
	"rating" jsonb DEFAULT '{}',
	"trust_level" varchar(16) DEFAULT 'unrated',
	"max_concurrency" jsonb DEFAULT '1',
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"global_name" text NOT NULL,
	"space_type" varchar(32) NOT NULL,
	"space_scope" text NOT NULL,
	"card_type" "card_type" NOT NULL,
	"status" "card_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]',
	"sources" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_cards_global_name_unique" UNIQUE("global_name")
);
--> statement-breakpoint
CREATE TABLE "knowledge_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_card_id" uuid NOT NULL,
	"to_card_id" uuid NOT NULL,
	"relation_type" varchar(64) NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tag_trees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tree_name" text NOT NULL,
	"space_type" varchar(32) NOT NULL,
	"parent_path" text,
	"full_path" text NOT NULL,
	"label" text NOT NULL,
	"depth" varchar(8) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tag_trees_full_path_unique" UNIQUE("full_path")
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"aggregate_id" uuid,
	"project_id" uuid,
	"payload" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"consumer" text NOT NULL,
	"event_id" uuid NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "processed_events_consumer_event_id_pk" PRIMARY KEY("consumer","event_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid,
	"event_type" varchar(128) NOT NULL,
	"aggregate_id" uuid,
	"payload" jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hypotheses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"logic_node_id" text,
	"statement" text NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"confidence" varchar(16) DEFAULT 'unknown',
	"evidence" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "logic_trees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"tree_type" varchar(32) NOT NULL,
	"phase" "project_phase" NOT NULL,
	"version" varchar(16) DEFAULT '1' NOT NULL,
	"nodes" jsonb DEFAULT '[]' NOT NULL,
	"edges" jsonb DEFAULT '[]' NOT NULL,
	"metadata" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"phase" "project_phase" DEFAULT 'init' NOT NULL,
	"context" jsonb DEFAULT '{}',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"task_type" "task_type" NOT NULL,
	"title" text NOT NULL,
	"purpose" text NOT NULL,
	"linked_hypothesis_id" uuid,
	"linked_logic_node_id" text,
	"knowledge_context_refs" jsonb DEFAULT '[]',
	"required_capabilities" jsonb DEFAULT '[]',
	"required_permissions" jsonb DEFAULT '[]',
	"expected_output_schema" jsonb,
	"acceptance_criteria" jsonb,
	"priority_score" integer DEFAULT 0,
	"deadline" timestamp,
	"depends_on" jsonb DEFAULT '[]',
	"claim_policy" varchar(32) DEFAULT 'exclusive',
	"review_policy" varchar(32) DEFAULT 'auto',
	"risk_level" varchar(16) DEFAULT 'low',
	"status" "task_status" DEFAULT 'open' NOT NULL,
	"assigned_to" uuid,
	"claimed_by" uuid,
	"claimed_at" timestamp,
	"lease_expires_at" timestamp,
	"heartbeat_at" timestamp,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_read_view" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"task_type" "task_type" NOT NULL,
	"title" text NOT NULL,
	"status" "task_status" NOT NULL,
	"claimed_by" uuid,
	"priority_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_instances" ADD CONSTRAINT "agent_instances_base_agent_id_participants_id_fk" FOREIGN KEY ("base_agent_id") REFERENCES "public"."participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_relations" ADD CONSTRAINT "knowledge_relations_from_card_id_knowledge_cards_id_fk" FOREIGN KEY ("from_card_id") REFERENCES "public"."knowledge_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_relations" ADD CONSTRAINT "knowledge_relations_to_card_id_knowledge_cards_id_fk" FOREIGN KEY ("to_card_id") REFERENCES "public"."knowledge_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD CONSTRAINT "hypotheses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logic_trees" ADD CONSTRAINT "logic_trees_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox_events" USING btree ("published_at","created_at");--> statement-breakpoint
CREATE INDEX "task_read_open_idx" ON "task_read_view" USING btree ("project_id","status");