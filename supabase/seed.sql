-- Optional starter content. Run once in the SQL editor (service role / postgres).
with p as (
  insert into public.typing_passages (title, body, difficulty, published) values
  ('ओळख आणि सराव', 'माझे नाव राज आहे. मी पुण्यात राहतो. मला मराठी टायपिंग शिकायला आवडते. रोज सराव केला की वेग वाढतो आणि चुका कमी होतात.', 'beginner', true),
  ('महाराष्ट्र', 'महाराष्ट्र ही संतांची आणि वीरांची भूमी आहे. येथे अनेक किल्ले, नद्या आणि डोंगर आहेत. सह्याद्रीच्या कुशीत वसलेले हे राज्य आपल्या संस्कृतीसाठी ओळखले जाते.', 'intermediate', true),
  ('नागरिकांचे हक्क', 'भारतीय संविधानाने प्रत्येक नागरिकाला समान हक्क दिले आहेत. स्वातंत्र्य, समता आणि बंधुता ही लोकशाहीची मूलभूत तत्त्वे आहेत. सुजाण नागरिक म्हणून आपले कर्तव्य पार पाडणे महत्त्वाचे आहे.', 'advanced', true)
  returning id, title
)
insert into public.typing_lessons (title, passage_id, difficulty, mode, duration_sec, min_accuracy, require_completion, published, sort_order)
select case title when 'ओळख आणि सराव' then 'धडा १ — ओळख' when 'महाराष्ट्र' then 'धडा २ — महाराष्ट्र' else 'सराव परीक्षा — ५ मिनिटे' end,
       id,
       case title when 'ओळख आणि सराव' then 'beginner' when 'महाराष्ट्र' then 'intermediate' else 'advanced' end,
       case title when 'नागरिकांचे हक्क' then 'exam' else 'practice' end,
       case title when 'ओळख आणि सराव' then 180 else 300 end,
       case title when 'ओळख आणि सराव' then 85 else 95 end,
       title <> 'नागरिकांचे हक्क', true,
       case title when 'ओळख आणि सराव' then 1 when 'महाराष्ट्र' then 2 else 10 end
from p;

-- Make yourself admin (replace the e-mail). Only SQL/service role can do this:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
