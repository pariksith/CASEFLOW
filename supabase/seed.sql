-- Seed file for local development testing
-- Run AFTER all migrations

-- Insert a test advocate user
INSERT INTO public.users (id, phone, name, enrollment_number, office_address, email)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '+919876543210',
  'Rajesh Kumar',
  'TN/2018/12345',
  'Chamber No. 5, City Civil Court, Chennai - 600104',
  'rajesh.advocate@example.com'
) ON CONFLICT (id) DO NOTHING;

-- Insert a test case
INSERT INTO public.cases (
  id, advocate_id, case_type, stage, jurisdiction_city,
  notice_sent_date, waiting_period_end, complaint_deadline
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'cheque_bounce',
  'waiting_period',
  'Chennai',
  CURRENT_DATE - INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '5 days',
  CURRENT_DATE + INTERVAL '35 days'
) ON CONFLICT (id) DO NOTHING;

-- Insert case parties
INSERT INTO public.case_parties (case_id, role, name, address)
VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    'client',
    'Ramesh Subramaniam',
    'No. 12, Anna Nagar, Chennai - 600040'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'opposite_party',
    'Suresh Krishnan',
    'No. 45, T Nagar, Chennai - 600017'
  )
ON CONFLICT DO NOTHING;

-- Insert financials
INSERT INTO public.case_financials (
  case_id, cheque_number, cheque_date, cheque_amount,
  bank_name, dishonour_reason, return_memo_date
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '001234',
  CURRENT_DATE - INTERVAL '45 days',
  500000.00,
  'State Bank of India, Adyar Branch',
  'Insufficient funds',
  CURRENT_DATE - INTERVAL '40 days'
) ON CONFLICT DO NOTHING;

-- Insert event timeline
INSERT INTO public.event_timeline (case_id, event_date, event_description, is_approximate, sequence_order)
VALUES
  ('10000000-0000-0000-0000-000000000001', '2024-01-10', 'Loan of ₹5,00,000 given to Suresh Krishnan', false, 1),
  ('10000000-0000-0000-0000-000000000001', '2024-03-15', 'Cheque No. 001234 issued by Suresh Krishnan', false, 2),
  ('10000000-0000-0000-0000-000000000001', 'approximate April 2024', 'Cheque presented for clearing at SBI', true, 3),
  ('10000000-0000-0000-0000-000000000001', '2024-04-05', 'Cheque dishonoured — Insufficient funds', false, 4),
  ('10000000-0000-0000-0000-000000000001', '2024-04-05', 'Return memo received from bank', false, 5)
ON CONFLICT DO NOTHING;

-- Insert case facts
INSERT INTO public.case_facts (
  case_id, cheque_signed_by_drawer, statutory_notice_already_sent,
  part_payment_made, written_admission_available,
  notice_delivery_mode, raw_story
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  true, false, false, false, 'post',
  'My client Ramesh lent ₹5 lakhs to Suresh in January 2024. Suresh gave a cheque as security. The cheque bounced with insufficient funds when deposited in April 2024.'
) ON CONFLICT DO NOTHING;

-- Insert a reminder
INSERT INTO public.reminders (
  case_id, advocate_id, reminder_type, trigger_date, status
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'payment_wait_ending',
  CURRENT_DATE + INTERVAL '5 days',
  'pending'
) ON CONFLICT DO NOTHING;
