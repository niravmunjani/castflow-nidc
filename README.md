# CastFlow — NIDC Die Casting Production Planner

Production scheduling and planning system for NIDC (aluminum die casting company in Estherville, Iowa).

## Features
- **Excel Upload**: Upload your weekly Production Schedule Excel file
- **Machine Gantt**: Visual shift-by-shift schedule for all 13 casting machines (M2-M14)
- **Dashboard**: KPIs, urgent parts, machine utilization, production flow
- **$45K Target**: Daily revenue tracking with worker production guide
- **Orders**: Fully editable inline table with add/delete/duplicate
- **Scheduling**: Auto-scheduler that minimizes die changes
- **Crew**: Worker and supervisor assignments per machine per shift
- **Painting**: Off-site painting department tracking
- **Bilingual**: English/Spanish toggle for floor workers

## Tech Stack
- **Frontend**: Next.js (React)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (free tier)
- **Cost**: $0/month

## Setup
1. Create a Supabase project at supabase.com
2. Run `supabase_schema.sql` in the SQL Editor
3. Copy `.env.local.example` to `.env.local` and add your credentials
4. Deploy to Vercel

See `DEPLOYMENT_GUIDE.docx` for step-by-step instructions.
